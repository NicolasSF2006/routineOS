# Segurança

- chaves existem somente no servidor e `.env.local` é ignorado;
- entradas do Mentor têm limites de corpo, mensagem, histórico e contexto;
- rotas do Mentor possuem rate limit local e timeout externo;
- ações de IA são listas discriminadas e validadas;
- Markdown não habilita HTML bruto e links usam `noopener noreferrer`;
- logs estruturados não registram conteúdo nem segredos;
- metadados externos bloqueiam redes privadas após DNS, validam cada redirect e limitam download;
- backup valida origem, schema, entidades e tamanho.

O rate limit em memória é adequado a uma instância simples, mas não é coordenado entre múltiplas réplicas. Uma futura implementação distribuída deve obedecer à mesma interface sem tornar serviço pago obrigatório.

## Limitações conhecidas

- A auditoria automatizada encontrou combinações da paleta atual abaixo do contraste WCAG AA.
  A regra `color-contrast` permanece fora do gate do axe porque a correção exige mudar cores e
  violaria a preservação visual desta refatoração. Deve ser reativada após aprovação de design.

Relate vulnerabilidades de forma privada ao mantenedor; não inclua chaves, backups reais ou conteúdo de conversas no relato.

## Limites e identificação de cliente

Corpos JSON são lidos em streaming, contados em bytes e cancelados assim que ultrapassam o limite. O contexto do Mentor é reconstruído somente com propriedades conhecidas e valida rotina, blocos, horários, registros, configurações, trilhas, cursos, temas, mensagens, profundidade e quantidades máximas.

Chat e metadados possuem limites separados; metadados aceita 10 requisições por minuto e inclui `Retry-After` no 429. Por padrão, headers de proxy não são confiáveis. `RATE_LIMIT_TRUST_PROXY_HOPS` deve conter a quantidade exata de proxies controlados; o endereço é então escolhido da direita para a esquerda em `x-forwarded-for`.

O store em memória tem limite rígido de 10.000 buckets: remove expirados e depois o menos recentemente acessado usando a ordem LRU aproximada do `Map`, sem varredura para localizar o bucket. Ele não coordena cotas entre réplicas; `RateLimitStore` é a fronteira para uma implementação distribuída futura.

O fingerprint alternativo baseado em cabeçalhos do navegador é apenas uma proteção de melhor esforço e pode variar. Em produção atrás de proxy controlado, configure `RATE_LIMIT_TRUST_PROXY_HOPS` corretamente; para múltiplas réplicas, adote futuramente um store distribuído.
