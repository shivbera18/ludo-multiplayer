import { createRealtimeServer } from './server.js';

const port = Number(process.env.PORT ?? 3000);
const { server } = createRealtimeServer();

server.listen(port, () => {
  console.log(`Backend listening on :${port}`);
});
