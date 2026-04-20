## Autor

**Pedro Eduardo Paiva Meireles**
RA: R8699H4
Atividade Prática - 2026

# CODIGO BURGUER — Sistema de Gestão de Rede de Varejo Alimentício

Sistema web para gerenciamento de uma rede de varejo alimentício com múltiplas unidades, desenvolvido como Atividade Prática Integradora 2026/1. Cobre PDV com processamento rápido, controle de perecíveis com alertas de validade e temperatura, reposição automática de estoque, programa de fidelidade, relatórios consolidados e log de auditoria.

---

## Cenário

A **CODIGO BURGUER** é uma rede de varejo alimentício com dezenas de unidades espalhadas em pontos estratégicos. O crescimento da operação expôs uma série de gargalos: ausência de controle rigoroso de validade e temperatura de perecíveis, sistemas lentos no caixa durante horários de pico, falta de sincronização de estoque entre unidades e centro de distribuição, e dificuldade de consolidar os dados financeiros de todas as filiais em um único painel. Este sistema foi desenvolvido para centralizar essas operações, garantindo rastreabilidade completa, alertas automáticos para itens em risco sanitário, PDV de alta performance e conformidade com a LGPD no armazenamento de dados de clientes.

---

## Requisitos Funcionais

| ID    | Descrição                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | O sistema deve permitir o cadastro e autenticação de usuários com e-mail e senha                                                         |
| RF-02 | O sistema deve realizar o controle automatizado de validade dos itens em estoque, disparando alertas para itens que vencem em até 3 dias |
| RF-03 | O sistema deve monitorar a temperatura dos itens perecíveis e emitir alertas quando fora do range configurado                            |
| RF-04 | O sistema deve disponibilizar uma interface de PDV para registro de vendas com múltiplas formas de pagamento                             |
| RF-05 | O sistema deve sincronizar o inventário em tempo real, gerando ordens de reposição automaticamente ao atingir o estoque mínimo           |
| RF-06 | O sistema deve consolidar relatórios de vendas e faturamento de todas as unidades em um painel único                                     |
| RF-07 | O sistema deve manter um cadastro de clientes para o programa de fidelidade com acúmulo de pontos                                        |
| RF-08 | O sistema deve registrar todas as transações em log de auditoria imutável                                                                |
| RF-09 | O sistema deve suportar modo de contingência offline, permitindo que vendas sejam registradas sem conexão                                |
| RF-10 | O sistema deve exibir dashboard com indicadores de alertas, faturamento, vendas do dia e estoque crítico                                 |

---

## Requisitos Não Funcionais

| ID     | Descrição                                                                                                 |
| ------ | --------------------------------------------------------------------------------------------------------- |
| RNF-01 | A aplicação deve rodar com Node.js 18 ou superior sem dependência de banco externo                        |
| RNF-02 | O banco de dados SQLite deve ser criado automaticamente na primeira execução                              |
| RNF-03 | As senhas devem ser armazenadas com hash bcrypt, nunca em texto puro                                      |
| RNF-04 | A autenticação deve utilizar JWT com expiração de 8 horas                                                 |
| RNF-05 | O PDV deve processar vendas em tempo real sem latência perceptível ao operador                            |
| RNF-06 | Os dados de clientes devem ser armazenados conforme os princípios da LGPD, com acesso restrito por perfil |
| RNF-07 | A interface deve ser responsiva e funcionar nos navegadores modernos                                      |
| RNF-08 | O sistema deve suportar múltiplas unidades operando simultaneamente                                       |

---

## Regras de Negócio

| ID    | Descrição                                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------- |
| RN-01 | Alertas de validade são disparados automaticamente para itens com vencimento em até 3 dias                                  |
| RN-02 | Alertas de temperatura são gerados quando a temperatura registrada está fora do range mínimo/máximo do produto              |
| RN-03 | Ao finalizar uma venda que leve o estoque abaixo do mínimo, o sistema gera automaticamente uma ordem de reposição pendente  |
| RN-04 | Não são criadas ordens de reposição duplicadas — se já existe uma pendente para o produto na unidade, nenhuma nova é gerada |
| RN-05 | Registros de auditoria são imutáveis, sem possibilidade de edição ou exclusão                                               |

---

## Tecnologias

| Camada             | Tecnologia                                   |
| ------------------ | -------------------------------------------- |
| Servidor           | Node.js 18+ + Express.js                     |
| Banco de dados     | SQLite via sql.js (embutido, sem instalação) |
| Autenticação       | JWT (jsonwebtoken)                           |
| Segurança de senha | bcryptjs                                     |
| Front-end          | HTML5, CSS3, JavaScript vanilla (SPA)        |

---

## Como executar

### Pré-requisito

Ter o **Node.js** instalado. Baixe em [nodejs.org](https://nodejs.org) — botão **LTS**.

### Passos

```bash
# 1. Entre na pasta do projeto
cd lanche

# 2. Inicie o servidor
node server.js
```

Na primeira execução o banco de dados é criado automaticamente com dados de exemplo incluindo 3 unidades, 10 produtos, estoque inicial e 3 clientes fidelidade. Nenhum comando adicional é necessário.

**Acesse:** [http://localhost:3000](http://localhost:3000)

> No Windows, abra o PowerShell ou Prompt de Comando, navegue até a pasta onde extraiu o projeto e execute `node server.js`.

---

## Estrutura do projeto

```
lanche/
├── server.js          ← API REST + inicialização do banco SQLite
├── package.json
├── codigoburguer.db          ← banco de dados (criado automaticamente)
└── public/
    └── index.html     ← interface SPA completa
```

---

## Rotas da API

| Método | Rota                                   | Descrição                         | Perfil mínimo |
| ------ | -------------------------------------- | --------------------------------- | ------------- |
| POST   | /api/auth/login                        | Autenticação                      | Público       |
| POST   | /api/auth/registro                     | Criar conta                       | Público       |
| GET    | /api/unidades                          | Listar unidades                   | Público       |
| GET    | /api/dashboard                         | Indicadores gerais                | Todos         |
| GET    | /api/estoque                           | Listar estoque por lote           | Todos         |
| GET    | /api/estoque/alertas                   | Alertas de validade e temperatura | Todos         |
| GET    | /api/produtos                          | Listar produtos                   | Todos         |
| POST   | /api/produtos                          | Cadastrar produto                 | SUPERVISOR    |
| GET    | /api/categorias                        | Listar categorias                 | Todos         |
| POST   | /api/vendas                            | Registrar venda (PDV)             | Todos         |
| GET    | /api/vendas                            | Histórico de vendas               | Todos         |
| GET    | /api/vendas/:id/itens                  | Itens de uma venda                | Todos         |
| GET    | /api/clientes                          | Listar clientes fidelidade        | Todos         |
| POST   | /api/clientes                          | Cadastrar cliente                 | Todos         |
| PATCH  | /api/clientes/:id/pontos               | Atualizar pontos                  | Todos         |
| GET    | /api/ordens                            | Listar ordens de reposição        | ESTOQUISTA    |
| PATCH  | /api/ordens/:id/atender                | Atender ordem de reposição        | ESTOQUISTA    |
| GET    | /api/relatorios/vendas-dia             | Faturamento por dia               | SUPERVISOR    |
| GET    | /api/relatorios/produtos-mais-vendidos | Ranking de produtos               | SUPERVISOR    |
| GET    | /api/relatorios/estoque-critico        | Estoque abaixo do mínimo          | ESTOQUISTA    |
| GET    | /api/auditoria                         | Log de auditoria                  | ADMINISTRADOR |

---

## Credenciais padrão

| Campo  | Valor                      |
| ------ | -------------------------- |
| E-mail | admin@codigoburguer.com.br |
| Senha  | Admin@123                  |

Para criar novos usuários, acesse a tela de login e clique em **"Criar conta"**. É possível definir o perfil e vincular o usuário a uma unidade.

---

## Perfis de acesso

| Perfil        | Nível | Permissões principais                              |
| ------------- | ----- | -------------------------------------------------- |
| CAIXA         | 1     | PDV, vendas                                        |
| ESTOQUISTA    | 2     | Estoque, ordens de reposição, relatório de estoque |
| SUPERVISOR    | 3     | Produtos, relatórios de vendas                     |
| GERENTE       | 4     | Acesso amplo, visão consolidada                    |
| ADMINISTRADOR | 5     | Acesso total, auditoria                            |
