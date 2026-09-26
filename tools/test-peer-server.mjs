import { PeerServer } from "peer";

const server = PeerServer({ port: 9000, host: "127.0.0.1", path: "/peerjs" });
process.on("SIGTERM", () => server.close());
