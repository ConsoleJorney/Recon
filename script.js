/**
 * RECON - JOGO DE NAVINHA RETRO (HTML5 CANVAS)
 * Arquitetura: Game Loop Baseado em Frames Nativos
 * Efeito: Screen Wrapping (Pac-Man) nas bordas da tela
 * Correção: Bug de movimentação automática pós-Game Over corrigido de vez!
 * Otimização: Sem Shadow Blur para rodar a 60 FPS cravados e estáveis
 */

// --- CONFIGURAÇÃO INICIAL DO AMBIENTE ---
const tela = document.getElementById("tela");
const ctx = tela.getContext("2d");

/**
 * Redimensiona a área de desenho para ocupar toda a janela do navegador.
 */
function ajustarTelaCheia() {
    tela.width = window.innerWidth;
    tela.height = window.innerHeight;
    
    // Recria as estrelas para se adaptarem à nova resolução
    criarEstrelasIniciais();
}

// --- ENTIDADES DO JOGO (ESTADOS) ---

// Configurações e Vetores do Jogador
const playerWidth = 50;
const playerHeight = 50;
let playerX = 0;
let playerY = 0;
const velocidadenave = 9; // Pixels movidos por frame

// Gerenciamento de Projéteis (Arma)
let tiros = [];
const velocidadetiro = 16;
let ultimoTiro = 0;         // Timestamp (ms) do último disparo efetuado
const cooldownTiro = 200;    // Intervalo mínimo entre disparos em milissegundos

// Gerenciamento de Inimigos e Spawns
let inimigos = [];
const velocidadeInimigoBase = 4.5;
let frameCount = 0;         // Contador de ciclos para temporizar eventos

// Sistema de Fundo Dinâmico (Parallax)
let estrelas = [];

// Estado Global do Sistema
let pontos = 0;
const teclas = {}; // Objeto para espelhar as teclas pressionadas

// --- FUNÇÕES DE INICIALIZAÇÃO E LIMPEZA ---

/**
 * Popula o array de estrelas com posições e velocidades aleatórias.
 */
function criarEstrelasIniciais() {
    estrelas = []; // Limpa o buffer de estrelas anterior
    for (let i = 0; i < 60; i++) {
        estrelas.push({
            x: Math.random() * tela.width,
            y: Math.random() * tela.height,
            tamanho: Math.random() * 2 + 1,       // Tamanho varia entre 1px e 3px
            velocidade: Math.random() * 4 + 1     // Velocidade de descida aleatória
        });
    }
}

/**
 * Reseta todas as variáveis de estado para reiniciar a partida de forma limpa.
 */
function resetarJogo() {
    pontos = 0;
    frameCount = 0; 
    inimigos = [];
    tiros = [];
    
    // CORREÇÃO CRÍTICA DO BUG: Limpa o estado do teclado para evitar movimentação involuntária
    for (let tecla in teclas) {
        teclas[tecla] = false;
    }

    // Centraliza o jogador na base da tela
    playerX = tela.width / 2 - playerWidth / 2;
    playerY = tela.height - playerHeight - 50;
}

// Execução dos gatilhos iniciais de configuração
ajustarTelaCheia();
resetarJogo();

// Escuta eventos do navegador para redimensionamento
window.addEventListener("resize", function () {
    ajustarTelaCheia();
});

// --- SUBSISTEMA DE ENTRADA (KEYBOARD INPUT) ---
document.addEventListener("keydown", function (event) {
    teclas[event.key] = true;
});

document.addEventListener("keyup", function (event) {
    teclas[event.key] = false;
});

// --- ENGINE LOGIC (COLISÕES E DIRECIONAMENTO) ---

/**
 * Algoritmo de Interseção de Caixas Alinhadas pelo Eixo (AABB Collision).
 */
function checarColisao(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
        rect1.x + htmlRectWidth(rect1) > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y;
}

// Função auxiliar para legibilidade da colisão
function htmlRectWidth(rect) {
    return rect.width;
}

/**
 * Efeito Pac-Man (Screen Wrapping):
 * Permite que a nave atravesse uma borda e apareça magicamente na extremidade oposta.
 */
function travarJogadorNasBordas() {
    // Se sair completamente pela ESQUERDA, surge na DIREITA
    if (playerX < -playerWidth) {
        playerX = tela.width;
    }
    // Se sair completamente pela DIREITA, surge na ESQUERDA
    if (playerX > tela.width) {
        playerX = -playerWidth;
    }
    // Se sair completamente pelo TETO, surge no CHÃO
    if (playerY < -playerHeight) {
        playerY = tela.height;
    }
    // Se sair completamente pelo CHÃO, surge no TETO
    if (playerY > tela.height) {
        playerY = -playerHeight;
    }
}

// --- CORE LOOPS (ATUALIZAÇÃO E DESENHO) ---

/**
 * Processa toda a física, posições, entradas e detecção de colisões.
 */
function atualizar() {
    frameCount++;

    // 1. Controle de Cadência de Tiro (Ataque Contínuo com Cooldown)
    if (teclas[" "]) {
        let tempoAtual = Date.now();
        if (tempoAtual - ultimoTiro >= cooldownTiro) {
            tiros.push({
                x: playerX + playerWidth / 2 - 3, // Centraliza o tiro no bico da nave
                y: playerY - 5,
                width: 6,
                height: 20
            });
            ultimoTiro = tempoAtual; 
        }
    }

    // 2. Movimentação das Estrelas (Fundo)
    for (let i = 0; i < estrelas.length; i++) {
        estrelas[i].y += estrelas[i].velocidade;
        if (estrelas[i].y > tela.height) {
            estrelas[i].y = 0;
            estrelas[i].x = Math.random() * tela.width;
        }
    }

    // 3. Processamento de Entrada do Jogador
    if (teclas["ArrowLeft"])  playerX -= velocidadenave;
    if (teclas["ArrowRight"]) playerX += velocidadenave;
    if (teclas["ArrowUp"])    playerY -= velocidadenave;
    if (teclas["ArrowDown"])  playerY += velocidadenave;

    // Aplica o efeito de teletransporte imediatamente após o movimento
    travarJogadorNasBordas();

    // 4. Atualização e Limpeza dos Tiros Aliados
    for (let i = 0; i < tiros.length; i++) {
        tiros[i].y -= velocidadetiro;
    }
    tiros = tiros.filter(tiro => tiro.y > -tiro.height);

    // 5. Fábrica/Spawn de Inimigos Variados (Gerador Aleatório)
    if (frameCount % 35 === 0) { 
        let chance = Math.random();
        let novoInimigo = {};

        if (chance < 0.5) {
            // 50% de chance: Alienígena Comum
            novoInimigo = { tipo: "alien_comum", width: 45, height: 45, velocidadeY: velocidadeInimigoBase };
        } else if (chance < 0.8) {
            // 30% de chance: Meteoro (Grande e pesado)
            novoInimigo = { tipo: "meteoro", width: 65, height: 65, velocidadeY: velocidadeInimigoBase + 0.5 };
        } else {
            // 20% de chance: Caça Invasor (Pequeno e veloz)
            novoInimigo = { tipo: "alien_veloz", width: 30, height: 30, velocidadeY: velocidadeInimigoBase + 2.5 };
        }

        novoInimigo.x = Math.random() * (tela.width - novoInimigo.width);
        novoInimigo.y = -novoInimigo.height; // Nasce logo acima do topo visível
        inimigos.push(novoInimigo);
    }

    // 6. Atualização e Limpeza de Inimigos
    for (let i = 0; i < inimigos.length; i++) {
        inimigos[i].y += inimigos[i].velocidadeY;
    }
    inimigos = inimigos.filter(inimigo => inimigo.y < tela.height);

    // 7. Sistema de Colisões Críticas
    
    // Colisão: Tiro Aliado vs Inimigos
    for (let i = tiros.length - 1; i >= 0; i--) {
        for (let j = inimigos.length - 1; j >= 0; j--) {
            if (checarColisao(tiros[i], inimigos[j])) {
                tiros.splice(i, 1);       
                inimigos.splice(j, 1);   
                pontos += 10;            
                break;                   
            }
        }
    }

    // Colisão: Inimigo vs Jogador (Condição de derrota)
    let retanguloJogador = { x: playerX, y: playerY, width: playerWidth, height: playerHeight };
    for (let i = inimigos.length - 1; i >= 0; i--) {
        if (checarColisao(retanguloJogador, inimigos[i])) {
            alert("GAME OVER! Pontuação: " + pontos);
            resetarJogo(); // Limpa estados e reinicia parado com total segurança
            break;
        }
    }
}

// --- SISTEMA DE RENDERIZAÇÃO VETORIAL ---

function desenharJogador(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = "#00f0ff";   // Corpo Ciano
    ctx.strokeStyle = "#ffffff"; // Contorno Branco Otimizado
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w / 2, y + h * 0.8);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function desenharLaser(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = "#39ff14"; // Laser Verde Neon Sólido
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#ffffff"; // Núcleo branco de alta performance
    ctx.fillRect(x + w/4, y, w/2, h);
    ctx.restore();
}

function desenharInimigo(inimigo) {
    ctx.save();
    
    if (inimigo.tipo === "alien_comum") {
        ctx.fillStyle = "#ff0055";
        ctx.strokeStyle = "#ffb3c6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(inimigo.x, inimigo.y);
        ctx.lineTo(inimigo.x + inimigo.width / 2, inimigo.y + inimigo.height);
        ctx.lineTo(inimigo.x + inimigo.width, inimigo.y);
        ctx.lineTo(inimigo.x + inimigo.width / 2, inimigo.y + inimigo.height * 0.3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        
    } else if (inimigo.tipo === "meteoro") {
        ctx.fillStyle = "#4a3b32";
        ctx.strokeStyle = "#6b5649";
        ctx.lineWidth = 2;
        ctx.beginPath();
        let cx = inimigo.x; let cy = inimigo.y; let w = inimigo.width; let h = inimigo.height;
        ctx.moveTo(cx + w * 0.3, cy); ctx.lineTo(cx + w * 0.7, cy); ctx.lineTo(cx + w, cy + h * 0.3);
        ctx.lineTo(cx + w * 0.9, cy + h * 0.8); ctx.lineTo(cx + w * 0.5, cy + h); ctx.lineTo(cx + w * 0.1, cy + h * 0.7);
        ctx.lineTo(cx, cy + h * 0.4);
        ctx.closePath(); 
        ctx.fill(); ctx.stroke();
        
    } else if (inimigo.tipo === "alien_veloz") {
        ctx.fillStyle = "#7209b7";
        ctx.strokeStyle = "#f72585";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(inimigo.x + inimigo.width / 2, inimigo.y);
        ctx.lineTo(inimigo.x + inimigo.width, inimigo.y + inimigo.height / 2);
        ctx.lineTo(inimigo.x + inimigo.width / 2, inimigo.y + inimigo.height);
        ctx.lineTo(inimigo.x, inimigo.y + inimigo.height / 2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
    }
    
    ctx.restore();
}

/**
 * Organiza e limpa as camadas visuais (Layers).
 */
function desenhar() {
    ctx.clearRect(0, 0, tela.width, tela.height);

    // Camada 1: Fundo Gradiente Espacial
    let gradiente = ctx.createLinearGradient(0, 0, 0, tela.height);
    gradiente.addColorStop(0, "#03030c");
    gradiente.addColorStop(1, "#08081e");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, tela.width, tela.height);

    // Camada 2: Estrelas de Fundo
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < estrelas.length; i++) {
        let e = estrelas[i];
        ctx.fillRect(e.x, e.y, e.tamanho, e.tamanho);
    }

    // Camada 3: Lasers
    for (let i = 0; i < tiros.length; i++) {
        desenharLaser(tiros[i].x, tiros[i].y, tiros[i].width, tiros[i].height);
    }

    // Camada 4: Inimigos e Meteoros
    for (let i = 0; i < inimigos.length; i++) {
        desenharInimigo(inimigos[i]);
    }

    // Camada 5: Nave do Jogador
    desenharJogador(playerX, playerY, playerWidth, playerHeight);

    // Camada 6: Interface de Pontuação (HUD)
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 22px 'Courier New', Courier, monospace";
    ctx.fillText("SCORE: " + String(pontos).padStart(4, '0'), 30, 45);
}

/**
 * Loop Principal executado na taxa nativa de atualização do monitor.
 */
function gameLoop() {
    atualizar(); 
    desenhar();   
    requestAnimationFrame(gameLoop); 
}

// Inicialização da Engine
gameLoop();