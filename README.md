# 🐝 Colmeia — Hive em HTML, CSS e JS

Versão web do jogo de tabuleiro **Hive**, feita só com HTML, CSS e JavaScript puro.

## Como jogar

Abra o `index.html` no navegador. Vence quem cercar os 6 lados da Abelha Rainha adversária.

- **2 Jogadores:** os dois jogam no mesmo aparelho.
- **Contra a máquina:** você joga com as Brancas, a máquina com as Amarelas (níveis Fácil e Normal).

## Peças

| Peça | Qtd | Movimento |
|---|---|---|
| 🐝 Abelha Rainha | 1 | Anda 1 espaço |
| 🪲 Besouro | 2 | Anda 1 espaço e pode subir nas peças |
| 🦗 Gafanhoto | 3 | Pula em linha reta sobre as peças |
| 🕷️ Aranha | 2 | Anda exatamente 3 espaços |
| 🐜 Formiga | 3 | Anda quanto quiser ao redor da colmeia |

## Recursos

- Regras oficiais: colmeia única, deslizar, colocação e Rainha até o 4º turno
- Layout responsivo, pensado para jogar no celular
- O tabuleiro se recentraliza e ajusta o zoom sozinho conforme a colmeia cresce

---

Developed by **Marco Nunes**

## App (PWA)

O jogo é um PWA: pode ser instalado no celular e funciona offline.
Publicado em: https://marcoaurello.github.io/gameHive/

Ao alterar qualquer arquivo do jogo, aumente a `VERSAO` em `service-worker.js`
para os aparelhos baixarem a versão nova.
