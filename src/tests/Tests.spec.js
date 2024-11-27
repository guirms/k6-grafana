import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Definindo métricas personalizadas
export const getContactsDuration = new Trend('get_contacts_duration', true); // Duração das chamadas GET
export const statusCodeRate = new Rate('status_code_valid');                 // Taxa de respostas com status válido

// Configuração de carga e thresholds
export const options = {
  thresholds: {
    // Threshold para menos de 12% de erros
    http_req_failed: ['rate<0.12'],
    // Threshold para 95% das requisições com duração abaixo de 5700ms
    get_contacts_duration: ['p(95)<5700'],
    // Threshold para garantir pelo menos 88% de respostas com status válido
    status_code_valid: ['rate>0.88']
  },
  stages: [
    { duration: '10s', target: 10 },   // Início com 10 VU's
    { duration: '1m', target: 100 }, // 1 minuto para chegar a 100 VU's
    { duration: '1m', target: 180 }, // Mais 2 minutos para alcançar 150 VU's
    { duration: '1m', target: 240 }, // Mais 4 minutos para alcançar 300 VU's
    { duration: '110s', target: 300 }    // 1 minuto para encerrar os testes
  ]
};

// Relatórios gerados ao final do teste
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data), // Relatório em HTML
    stdout: textSummary(data, { indent: ' ', enableColors: true }) // Resumo no console
  };
}

// Função principal que será executada
export default function () {
  const baseUrl = 'https://api.genderize.io/?name=luc';

  const params = {
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  // Realiza uma requisição GET
  const res = http.get(`${baseUrl}`, params);

  // Adiciona a duração da chamada GET à métrica personalizada
  getContactsDuration.add(res.timings.duration);

  // Adiciona à métrica de taxa se o status code for 200 (válido)
  statusCodeRate.add(res.status === OK);

  // Verifica se o status da resposta é OK
  check(res, {
    'GET Contacts - Status 200': () => res.status === OK
  });
}
