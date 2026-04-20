// ============================================================
// CODIGO BURGUER — Sistema de Gestão de Rede de Varejo Alimentício
// SEM banco externo — SQLite embutido (arquivo codigoburguer.db)
// Instalar: já incluso (node_modules na pasta)
// Rodar:    node server.js
// Acessar:  http://localhost:3000
// ============================================================

const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const path      = require('path');
const fs        = require('fs');
const initSqlJs = require('./node_modules/sql.js');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = 'codigoburguer_secret_2026';
const DB_FILE    = path.join(__dirname, 'codigoburguer.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── BANCO DE DADOS ──────────────────────────────────────────
let DB;

function salvarDB() {
  fs.writeFileSync(DB_FILE, Buffer.from(DB.export()));
}

function query(sql, params = []) {
  const stmt = DB.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  DB.run(sql, params);
  salvarDB();
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function iniciarBanco() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    DB = new SQL.Database(fs.readFileSync(DB_FILE));
    console.log('✅ Banco carregado: lanche.db');
  } else {
    DB = new SQL.Database();
    console.log('🆕 Criando banco novo...');
    criarTabelas();
    inserirDadosIniciais();
    salvarDB();
    console.log('✅ Banco criado com sucesso!');
  }
}

function criarTabelas() {
  DB.run(`CREATE TABLE IF NOT EXISTS unidade (
    id_unidade  TEXT PRIMARY KEY,
    nome        TEXT NOT NULL,
    endereco    TEXT,
    cidade      TEXT,
    estado      TEXT,
    ativo       INTEGER DEFAULT 1,
    criado_em   TEXT DEFAULT (datetime('now'))
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS usuario (
    id_usuario  TEXT PRIMARY KEY,
    nome        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    senha_hash  TEXT NOT NULL,
    perfil      TEXT NOT NULL DEFAULT 'CAIXA',
    id_unidade  TEXT REFERENCES unidade(id_unidade),
    ativo       INTEGER DEFAULT 1,
    criado_em   TEXT DEFAULT (datetime('now'))
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS categoria (
    id_categoria  TEXT PRIMARY KEY,
    nome          TEXT NOT NULL UNIQUE,
    criado_em     TEXT DEFAULT (datetime('now'))
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS produto (
    id_produto      TEXT PRIMARY KEY,
    nome            TEXT NOT NULL,
    descricao       TEXT,
    id_categoria    TEXT REFERENCES categoria(id_categoria),
    codigo_barras   TEXT UNIQUE,
    preco_venda     REAL NOT NULL DEFAULT 0,
    custo           REAL DEFAULT 0,
    perecivel       INTEGER DEFAULT 0,
    temp_minima     REAL,
    temp_maxima     REAL,
    estoque_minimo  INTEGER DEFAULT 5,
    ativo           INTEGER DEFAULT 1,
    criado_em       TEXT DEFAULT (datetime('now'))
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS estoque (
    id_estoque      TEXT PRIMARY KEY,
    id_produto      TEXT NOT NULL REFERENCES produto(id_produto),
    id_unidade      TEXT NOT NULL REFERENCES unidade(id_unidade),
    quantidade      INTEGER DEFAULT 0,
    data_validade   TEXT,
    lote            TEXT,
    temperatura     REAL,
    atualizado_em   TEXT DEFAULT (datetime('now'))
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS venda (
    id_venda        TEXT PRIMARY KEY,
    id_unidade      TEXT NOT NULL REFERENCES unidade(id_unidade),
    id_operador     TEXT NOT NULL REFERENCES usuario(id_usuario),
    valor_total     REAL DEFAULT 0,
    desconto        REAL DEFAULT 0,
    forma_pagamento TEXT DEFAULT 'DINHEIRO',
    status          TEXT DEFAULT 'ABERTA',
    modo_offline    INTEGER DEFAULT 0,
    criado_em       TEXT DEFAULT (datetime('now'))
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS item_venda (
    id_item         TEXT PRIMARY KEY,
    id_venda        TEXT NOT NULL REFERENCES venda(id_venda),
    id_produto      TEXT NOT NULL REFERENCES produto(id_produto),
    quantidade      INTEGER NOT NULL,
    preco_unitario  REAL NOT NULL,
    subtotal        REAL NOT NULL
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS cliente_fidelidade (
    id_cliente    TEXT PRIMARY KEY,
    nome          TEXT NOT NULL,
    cpf           TEXT UNIQUE,
    email         TEXT,
    telefone      TEXT,
    pontos        INTEGER DEFAULT 0,
    ativo         INTEGER DEFAULT 1,
    criado_em     TEXT DEFAULT (datetime('now'))
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS ordem_reposicao (
    id_ordem      TEXT PRIMARY KEY,
    id_produto    TEXT NOT NULL REFERENCES produto(id_produto),
    id_unidade    TEXT NOT NULL REFERENCES unidade(id_unidade),
    quantidade    INTEGER NOT NULL,
    status        TEXT DEFAULT 'PENDENTE',
    gerado_auto   INTEGER DEFAULT 0,
    criado_em     TEXT DEFAULT (datetime('now'))
  )`);

  DB.run(`CREATE TABLE IF NOT EXISTS log_auditoria (
    id_log        TEXT PRIMARY KEY,
    id_usuario    TEXT,
    id_unidade    TEXT,
    operacao      TEXT NOT NULL,
    descricao     TEXT,
    ip            TEXT,
    criado_em     TEXT DEFAULT (datetime('now'))
  )`);
}

function inserirDadosIniciais() {
  // Unidades
  const unidades = [
    [uuid(), 'Unidade Centro', 'Rua das Flores, 100', 'São Paulo', 'SP'],
    [uuid(), 'Unidade Norte', 'Av. Brasil, 500', 'São Paulo', 'SP'],
    [uuid(), 'Unidade Sul', 'Rua do Comércio, 200', 'São Paulo', 'SP'],
  ];
  for (const u of unidades)
    DB.run('INSERT INTO unidade (id_unidade,nome,endereco,cidade,estado) VALUES (?,?,?,?,?)', u);

  const idUnidade = unidades[0][0];

  // Admin
  const hashAdmin = '$2b$10$f7CcsG.Dx/rfx8Qjan.TWuRVtdx.tSAwZcb2V9a78.j1DOYlAKoPS';
  DB.run('INSERT INTO usuario (id_usuario,nome,email,senha_hash,perfil,id_unidade) VALUES (?,?,?,?,?,?)',
    [uuid(), 'Administrador', 'admin@codigoburguer.com.br', hashAdmin, 'ADMINISTRADOR', idUnidade]);

  // Categorias
  const cats = [
    [uuid(), 'Lanches'],
    [uuid(), 'Bebidas'],
    [uuid(), 'Sobremesas'],
    [uuid(), 'Salgados'],
    [uuid(), 'Combos'],
  ];
  for (const c of cats)
    DB.run('INSERT INTO categoria (id_categoria,nome) VALUES (?,?)', c);

  const idLanche = cats[0][0];
  const idBebida = cats[1][0];
  const idSobremesa = cats[2][0];
  const idSalgado = cats[3][0];

  // Produtos
  const prods = [
    [uuid(), 'X-Burguer', 'Pão, hambúrguer 150g, queijo, alface e tomate', idLanche, '7891234100001', 18.90, 7.50, 1, 2, 8, 10],
    [uuid(), 'X-Salada', 'Pão, hambúrguer 150g, queijo, alface, tomate e molho', idLanche, '7891234100002', 21.90, 8.20, 1, 2, 8, 10],
    [uuid(), 'X-Bacon', 'Pão, hambúrguer duplo, bacon crocante e queijo', idLanche, '7891234100003', 26.90, 10.40, 1, 2, 8, 8],
    [uuid(), 'Refrigerante 350ml', 'Lata gelada sabores variados', idBebida, '7891234200001', 6.50, 2.10, 1, 0, 8, 30],
    [uuid(), 'Suco Natural 300ml', 'Laranja, limão ou maracujá', idBebida, '7891234200002', 8.90, 3.20, 1, 0, 8, 20],
    [uuid(), 'Água Mineral 500ml', 'Sem gás', idBebida, '7891234200003', 4.00, 1.20, 0, null, null, 50],
    [uuid(), 'Sorvete Casquinha', 'Baunilha ou chocolate', idSobremesa, '7891234300001', 7.00, 2.50, 1, -18, -10, 15],
    [uuid(), 'Milkshake 400ml', 'Morango, chocolate ou baunilha', idSobremesa, '7891234300002', 14.90, 5.80, 1, 0, 6, 10],
    [uuid(), 'Coxinha', 'Frango com catupiry', idSalgado, '7891234400001', 7.50, 2.80, 1, 2, 8, 20],
    [uuid(), 'Batata Frita P', 'Porção individual crocante', idLanche, '7891234100004', 12.90, 4.20, 1, 60, 90, 10],
  ];
  for (const p of prods)
    DB.run('INSERT INTO produto (id_produto,nome,descricao,id_categoria,codigo_barras,preco_venda,custo,perecivel,temp_minima,temp_maxima,estoque_minimo) VALUES (?,?,?,?,?,?,?,?,?,?,?)', p);

  // Estoque inicial
  const hoje = new Date();
  for (const p of prods) {
    for (const u of unidades) {
      const val = new Date(hoje);
      val.setDate(val.getDate() + 3 + Math.floor(Math.random() * 25));
      DB.run('INSERT INTO estoque (id_estoque,id_produto,id_unidade,quantidade,data_validade,lote,temperatura) VALUES (?,?,?,?,?,?,?)',
        [uuid(), p[0], u[0], Math.floor(10 + Math.random() * 90),
          val.toISOString().split('T')[0],
          `L${Math.floor(1000 + Math.random() * 9000)}`,
          p[8] !== null ? p[8] + Math.random() * 2 : null]);
    }
  }

  // Clientes fidelidade
  const clientes = [
    [uuid(), 'Maria Oliveira', '111.222.333-44', 'maria@email.com', '(11) 91111-2222', 350],
    [uuid(), 'João Silva', '222.333.444-55', 'joao@email.com', '(11) 92222-3333', 120],
    [uuid(), 'Ana Costa', '333.444.555-66', 'ana@email.com', '(11) 93333-4444', 890],
  ];
  for (const c of clientes)
    DB.run('INSERT INTO cliente_fidelidade (id_cliente,nome,cpf,email,telefone,pontos) VALUES (?,?,?,?,?,?)', c);
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
function auth(perfisPermitidos = []) {
  return (req, res, next) => {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ erro: 'Token não fornecido' });
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.usuario = payload;
      if (perfisPermitidos.length && !perfisPermitidos.includes(payload.perfil))
        return res.status(403).json({ erro: 'Acesso não autorizado' });
      next();
    } catch {
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
  };
}

const NIVEL = { CAIXA: 1, ESTOQUISTA: 2, SUPERVISOR: 3, GERENTE: 4, ADMINISTRADOR: 5 };
function minPerfil(p) {
  return (req, res, next) => {
    if ((NIVEL[req.usuario?.perfil] || 0) >= (NIVEL[p] || 99)) return next();
    res.status(403).json({ erro: `Requer perfil mínimo: ${p}` });
  };
}

function registrarLog(idUsuario, idUnidade, operacao, descricao) {
  try { run('INSERT INTO log_auditoria (id_log,id_usuario,id_unidade,operacao,descricao) VALUES (?,?,?,?,?)',
    [uuid(), idUsuario, idUnidade, operacao, descricao]); } catch (_) {}
}

// ─── AUTH ─────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });
  const rows = query('SELECT * FROM usuario WHERE email=? AND ativo=1', [email]);
  if (!rows[0]) return res.status(401).json({ erro: 'Credenciais inválidas' });
  const ok = await bcrypt.compare(senha, rows[0].senha_hash);
  if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });
  const u = rows[0];
  const token = jwt.sign(
    { id: u.id_usuario, nome: u.nome, email: u.email, perfil: u.perfil, id_unidade: u.id_unidade },
    JWT_SECRET, { expiresIn: '8h' }
  );
  registrarLog(u.id_usuario, u.id_unidade, 'LOGIN', `Login de ${u.email}`);
  res.json({ token, perfil: u.perfil, nome: u.nome, id_unidade: u.id_unidade });
});

app.post('/api/auth/registro', async (req, res) => {
  const { nome, email, senha, perfil = 'CAIXA', id_unidade = null } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  if (senha.length < 6) return res.status(400).json({ erro: 'Senha deve ter no mínimo 6 caracteres' });
  if (query('SELECT 1 FROM usuario WHERE email=?', [email]).length)
    return res.status(409).json({ erro: 'E-mail já cadastrado' });
  const hash = await bcrypt.hash(senha, 10);
  const id = uuid();
  run('INSERT INTO usuario (id_usuario,nome,email,senha_hash,perfil,id_unidade) VALUES (?,?,?,?,?,?)',
    [id, nome, email, hash, perfil, id_unidade || null]);
  res.status(201).json({ mensagem: 'Conta criada com sucesso!' });
});

// ─── UNIDADES ─────────────────────────────────────────────────
app.get('/api/unidades', (req, res) => {
  res.json(query('SELECT id_unidade, nome, cidade, estado FROM unidade WHERE ativo=1 ORDER BY nome'));
});

// ─── DASHBOARD ────────────────────────────────────────────────
app.get('/api/dashboard', auth(), (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  const em3  = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

  const alertasVal  = query(`SELECT COUNT(*) AS c FROM estoque WHERE data_validade <= ? AND quantidade > 0`, [em3])[0]?.c || 0;
  const estoqueBaixo = query(`SELECT COUNT(*) AS c FROM estoque e JOIN produto p ON p.id_produto=e.id_produto WHERE e.quantidade <= p.estoque_minimo AND e.quantidade > 0`)[0]?.c || 0;
  const vendasHoje  = query(`SELECT COUNT(*) AS c FROM venda WHERE date(criado_em)=? AND status='FECHADA'`, [hoje])[0]?.c || 0;
  const faturHoje   = query(`SELECT COALESCE(SUM(valor_total),0) AS v FROM venda WHERE date(criado_em)=? AND status='FECHADA'`, [hoje])[0]?.v || 0;
  const ordensAbert = query(`SELECT COUNT(*) AS c FROM ordem_reposicao WHERE status='PENDENTE'`)[0]?.c || 0;
  const totalClientes = query(`SELECT COUNT(*) AS c FROM cliente_fidelidade WHERE ativo=1`)[0]?.c || 0;

  res.json({
    alertas_validade: alertasVal,
    estoque_baixo: estoqueBaixo,
    vendas_hoje: vendasHoje,
    faturamento_hoje: faturHoje,
    ordens_reposicao: ordensAbert,
    total_clientes: totalClientes,
  });
});

// ─── ESTOQUE ──────────────────────────────────────────────────
app.get('/api/estoque', auth(), (req, res) => {
  const rows = query(`
    SELECT e.id_estoque, p.nome AS produto, p.codigo_barras, c.nome AS categoria,
           e.quantidade, e.data_validade, e.lote, e.temperatura,
           u.nome AS unidade, p.estoque_minimo, p.perecivel,
           p.temp_minima, p.temp_maxima,
           CAST((julianday(e.data_validade) - julianday('now')) AS INTEGER) AS dias_vencimento,
           CASE WHEN e.quantidade <= p.estoque_minimo THEN 1 ELSE 0 END AS estoque_critico,
           CASE WHEN e.temperatura IS NOT NULL AND (e.temperatura < p.temp_minima OR e.temperatura > p.temp_maxima) THEN 1 ELSE 0 END AS temp_fora
    FROM estoque e
    JOIN produto p ON p.id_produto = e.id_produto
    JOIN unidade u ON u.id_unidade = e.id_unidade
    LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    ORDER BY e.data_validade ASC
  `);
  res.json(rows);
});

app.get('/api/estoque/alertas', auth(), (req, res) => {
  const em3 = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  const rows = query(`
    SELECT p.nome AS produto, e.lote, e.data_validade, e.quantidade,
           e.temperatura, p.temp_minima, p.temp_maxima, u.nome AS unidade,
           CAST((julianday(e.data_validade) - julianday('now')) AS INTEGER) AS dias_restantes,
           CASE WHEN e.temperatura IS NOT NULL AND (e.temperatura < p.temp_minima OR e.temperatura > p.temp_maxima) THEN 1 ELSE 0 END AS temp_fora
    FROM estoque e
    JOIN produto p ON p.id_produto = e.id_produto
    JOIN unidade u ON u.id_unidade = e.id_unidade
    WHERE (e.data_validade <= ? AND e.quantidade > 0)
       OR (e.temperatura IS NOT NULL AND p.temp_minima IS NOT NULL AND (e.temperatura < p.temp_minima OR e.temperatura > p.temp_maxima))
    ORDER BY e.data_validade ASC
  `, [em3]);
  res.json(rows);
});

// ─── PRODUTOS ─────────────────────────────────────────────────
app.get('/api/produtos', auth(), (req, res) => {
  res.json(query(`
    SELECT p.*, c.nome AS categoria_nome
    FROM produto p LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.ativo=1 ORDER BY p.nome
  `));
});

app.post('/api/produtos', auth(), minPerfil('SUPERVISOR'), (req, res) => {
  const { nome, descricao = '', id_categoria = null, codigo_barras = '', preco_venda = 0,
    custo = 0, perecivel = 0, temp_minima = null, temp_maxima = null, estoque_minimo = 5 } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const id = uuid();
  run(`INSERT INTO produto (id_produto,nome,descricao,id_categoria,codigo_barras,preco_venda,custo,perecivel,temp_minima,temp_maxima,estoque_minimo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, nome, descricao, id_categoria, codigo_barras, preco_venda, custo, perecivel ? 1 : 0, temp_minima, temp_maxima, estoque_minimo]);
  registrarLog(req.usuario.id, req.usuario.id_unidade, 'PRODUTO_CADASTRO', `Produto ${nome} cadastrado`);
  res.status(201).json({ id_produto: id, nome });
});

// ─── CATEGORIAS ───────────────────────────────────────────────
app.get('/api/categorias', auth(), (req, res) => {
  res.json(query('SELECT * FROM categoria ORDER BY nome'));
});

// ─── PDV / VENDAS ─────────────────────────────────────────────
app.post('/api/vendas', auth(), (req, res) => {
  const { id_unidade, itens = [], forma_pagamento = 'DINHEIRO', desconto = 0, modo_offline = 0 } = req.body;
  if (!id_unidade || !itens.length) return res.status(400).json({ erro: 'Dados incompletos' });

  let valorTotal = 0;
  for (const item of itens) {
    const prod = query('SELECT preco_venda FROM produto WHERE id_produto=? AND ativo=1', [item.id_produto])[0];
    if (!prod) return res.status(400).json({ erro: `Produto ${item.id_produto} não encontrado` });
    const est = query('SELECT quantidade FROM estoque WHERE id_produto=? AND id_unidade=?', [item.id_produto, id_unidade])[0];
    if (!modo_offline && (!est || est.quantidade < item.quantidade))
      return res.status(409).json({ erro: `Estoque insuficiente para o produto ${item.id_produto}` });
    valorTotal += item.quantidade * prod.preco_venda;
  }
  valorTotal = Math.max(0, valorTotal - desconto);

  const idVenda = uuid();
  run(`INSERT INTO venda (id_venda,id_unidade,id_operador,valor_total,desconto,forma_pagamento,status,modo_offline)
       VALUES (?,?,?,?,?,?,'FECHADA',?)`,
    [idVenda, id_unidade, req.usuario.id, valorTotal, desconto, forma_pagamento, modo_offline ? 1 : 0]);

  for (const item of itens) {
    const prod = query('SELECT preco_venda FROM produto WHERE id_produto=?', [item.id_produto])[0];
    const sub = item.quantidade * prod.preco_venda;
    run(`INSERT INTO item_venda (id_item,id_venda,id_produto,quantidade,preco_unitario,subtotal) VALUES (?,?,?,?,?,?)`,
      [uuid(), idVenda, item.id_produto, item.quantidade, prod.preco_venda, sub]);
    run(`UPDATE estoque SET quantidade = quantidade - ?, atualizado_em = datetime('now')
         WHERE id_produto=? AND id_unidade=?`, [item.quantidade, item.id_produto, id_unidade]);

    // Verificar estoque mínimo e gerar ordem automática (RN-03)
    const est = query(`SELECT e.quantidade, p.estoque_minimo FROM estoque e
                       JOIN produto p ON p.id_produto=e.id_produto
                       WHERE e.id_produto=? AND e.id_unidade=?`, [item.id_produto, id_unidade])[0];
    if (est && est.quantidade <= est.estoque_minimo) {
      const jaExiste = query(`SELECT 1 FROM ordem_reposicao WHERE id_produto=? AND id_unidade=? AND status='PENDENTE'`,
        [item.id_produto, id_unidade]);
      if (!jaExiste.length) {
        run(`INSERT INTO ordem_reposicao (id_ordem,id_produto,id_unidade,quantidade,gerado_auto) VALUES (?,?,?,?,1)`,
          [uuid(), item.id_produto, id_unidade, est.estoque_minimo * 3]);
      }
    }
  }

  registrarLog(req.usuario.id, id_unidade, 'VENDA', `Venda ${idVenda} - R$ ${valorTotal.toFixed(2)} - ${forma_pagamento}`);
  res.status(201).json({ id_venda: idVenda, valor_total: valorTotal, status: 'FECHADA' });
});

app.get('/api/vendas', auth(), (req, res) => {
  const rows = query(`
    SELECT v.id_venda, v.valor_total, v.desconto, v.forma_pagamento, v.status,
           v.modo_offline, v.criado_em, u2.nome AS unidade, u.nome AS operador
    FROM venda v
    JOIN unidade u2 ON u2.id_unidade = v.id_unidade
    JOIN usuario u ON u.id_usuario = v.id_operador
    ORDER BY v.criado_em DESC LIMIT 200
  `);
  res.json(rows);
});

app.get('/api/vendas/:id/itens', auth(), (req, res) => {
  res.json(query(`
    SELECT iv.*, p.nome AS produto FROM item_venda iv
    JOIN produto p ON p.id_produto = iv.id_produto
    WHERE iv.id_venda = ?
  `, [req.params.id]));
});

// ─── CLIENTES FIDELIDADE ──────────────────────────────────────
app.get('/api/clientes', auth(), (req, res) => {
  res.json(query('SELECT id_cliente, nome, cpf, email, telefone, pontos, criado_em FROM cliente_fidelidade WHERE ativo=1 ORDER BY nome'));
});

app.post('/api/clientes', auth(), (req, res) => {
  const { nome, cpf = '', email = '', telefone = '' } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  if (cpf && query('SELECT 1 FROM cliente_fidelidade WHERE cpf=?', [cpf]).length)
    return res.status(409).json({ erro: 'CPF já cadastrado' });
  const id = uuid();
  run('INSERT INTO cliente_fidelidade (id_cliente,nome,cpf,email,telefone) VALUES (?,?,?,?,?)',
    [id, nome, cpf, email, telefone]);
  res.status(201).json({ id_cliente: id, nome });
});

app.patch('/api/clientes/:id/pontos', auth(), (req, res) => {
  const { pontos } = req.body;
  if (pontos == null) return res.status(400).json({ erro: 'Pontos obrigatório' });
  run('UPDATE cliente_fidelidade SET pontos = pontos + ? WHERE id_cliente=?', [pontos, req.params.id]);
  const atual = query('SELECT pontos FROM cliente_fidelidade WHERE id_cliente=?', [req.params.id])[0];
  res.json({ id_cliente: req.params.id, pontos: atual?.pontos });
});

// ─── ORDENS DE REPOSIÇÃO ──────────────────────────────────────
app.get('/api/ordens', auth(), minPerfil('ESTOQUISTA'), (req, res) => {
  res.json(query(`
    SELECT o.*, p.nome AS produto, u.nome AS unidade
    FROM ordem_reposicao o
    JOIN produto p ON p.id_produto = o.id_produto
    JOIN unidade u ON u.id_unidade = o.id_unidade
    ORDER BY o.criado_em DESC
  `));
});

app.patch('/api/ordens/:id/atender', auth(), minPerfil('ESTOQUISTA'), (req, res) => {
  const ordem = query('SELECT * FROM ordem_reposicao WHERE id_ordem=?', [req.params.id])[0];
  if (!ordem) return res.status(404).json({ erro: 'Ordem não encontrada' });
  run(`UPDATE estoque SET quantidade = quantidade + ?, atualizado_em = datetime('now')
       WHERE id_produto=? AND id_unidade=?`, [ordem.quantidade, ordem.id_produto, ordem.id_unidade]);
  run("UPDATE ordem_reposicao SET status='ATENDIDA' WHERE id_ordem=?", [req.params.id]);
  registrarLog(req.usuario.id, ordem.id_unidade, 'REPOSICAO', `Ordem ${req.params.id} atendida — ${ordem.quantidade} unidades`);
  res.json({ id_ordem: req.params.id, status: 'ATENDIDA' });
});

// ─── RELATÓRIOS ───────────────────────────────────────────────
app.get('/api/relatorios/vendas-dia', auth(), minPerfil('SUPERVISOR'), (req, res) => {
  res.json(query(`
    SELECT date(criado_em) AS data, COUNT(*) AS qtd_vendas,
           SUM(valor_total) AS faturamento, AVG(valor_total) AS ticket_medio
    FROM venda WHERE status='FECHADA'
    GROUP BY date(criado_em) ORDER BY data DESC LIMIT 30
  `));
});

app.get('/api/relatorios/produtos-mais-vendidos', auth(), minPerfil('SUPERVISOR'), (req, res) => {
  res.json(query(`
    SELECT p.nome, SUM(iv.quantidade) AS total_vendido, SUM(iv.subtotal) AS receita
    FROM item_venda iv JOIN produto p ON p.id_produto = iv.id_produto
    GROUP BY p.nome ORDER BY total_vendido DESC LIMIT 20
  `));
});

app.get('/api/relatorios/estoque-critico', auth(), minPerfil('ESTOQUISTA'), (req, res) => {
  res.json(query(`
    SELECT p.nome, u.nome AS unidade, e.quantidade, p.estoque_minimo,
           e.data_validade, e.temperatura
    FROM estoque e
    JOIN produto p ON p.id_produto = e.id_produto
    JOIN unidade u ON u.id_unidade = e.id_unidade
    WHERE e.quantidade <= p.estoque_minimo
    ORDER BY e.quantidade ASC
  `));
});

// ─── AUDITORIA ────────────────────────────────────────────────
app.get('/api/auditoria', auth(['ADMINISTRADOR']), (req, res) => {
  res.json(query(`
    SELECT l.*, u.nome AS usuario_nome
    FROM log_auditoria l LEFT JOIN usuario u ON u.id_usuario = l.id_usuario
    ORDER BY l.criado_em DESC LIMIT 500
  `));
});

// ─── FRONTEND ─────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ────────────────────────────────────────────────────
iniciarBanco().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('🍔 CODIGO BURGUER rodando em http://localhost:' + PORT);
    console.log('');
    console.log('📧 Login padrão: admin@codigoburguer.com.br');
    console.log('🔑 Senha:        Admin@123');
    console.log('');
  });
});
