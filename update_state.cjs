const fs = require('fs');
const file = 'frontend/src/state/gameState.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/export function describeGameEvent.*?}\n/s, `export function describeGameEvent(event: GameEvent): string {
  const actor = event.playerId ? \` by \${event.playerId}\` : '';
  if (event.type === 'tokenMoved') {
    const payload = event.payload as any;
    if (payload?.captures && payload.captures.length > 0) {
      return \`Token moved \& captured opponent \${actor} ⚔️\`;
    }
    if (payload?.dice === 6) {
       return \`Rolled a 6! \${actor} 🎲\`;
    }
    return \`Token moved by \${payload?.dice} \${actor}\`;
  }
  return \`\${event.type} (\#\${event.sequence})\${actor}\`;
}
`);

fs.writeFileSync(file, code);
