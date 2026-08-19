// https://status.peerjs.com/

/**
 * Shape of a PeerJS `Peer`/`DataConnection`, loaded via CDN with no shipped
 * types. `on`'s handler is generic per call rather than `any[]`, so each
 * event keeps the param type its own listener declares (`id: string`,
 * `conn: PeerConnection`, ...) instead of widening every listener to `any`.
 */
interface PeerInstance {
  on<Args extends unknown[]>(event: string, handler: (...args: Args) => void): void;
  connect(peerId: string): PeerConnection;
}

interface PeerConnection {
  on<Args extends unknown[]>(event: string, handler: (...args: Args) => void): void;
  send(data: unknown): void;
  close(): void;
  peer: string;
}

export default class PeerManager {
  game: unknown;
  peers: Record<string, PeerConnection> = {};
  peer!: PeerInstance;
  id?: string;

  constructor(game: unknown) {
    this.game = game;
    this.init();
  }

  onConnected(id: string): void {}

  init(): void {
    // @ts-expect-error - PeerJS loaded via CDN
    this.peer = new Peer(null, {
      pingInterval: 1000,
      debug: 2, // 0 Prints no logs. 1 Prints only errors. 2 Prints errors and warnings. 3 Prints all logs.
    });
    this.peer.on('open', (id: string) => {
      console.log('My peer ID is: ' + id);
      this.id = id;
      this.onConnected?.(id);
    });
    this.peer.on('connection', (conn: PeerConnection) => {
      this.conn(conn);
    });
  }

  connect(peerId: string): void {
    if (this.peers[peerId]) return;
    const conn = this.peer.connect(peerId);
    this.conn(conn);
  }

  disconnect(peerId: string): void {
    if (!this.peers[peerId]) return;
    this.peers[peerId].close();
    delete this.peers[peerId];
  }

  conn(conn: PeerConnection): void {
    conn.on('error', (err: unknown) => {
      console.log('Connection error', err);
      delete this.peers[conn.peer];
    });
    conn.on('open', () => {
      console.log('Connected to: ' + conn.peer);
      this.peers[conn.peer] = conn;

      this.syncData(conn);

      conn.on('data', (data: unknown) => {
        this.syncDataFromOther(conn, data);
      });

      conn.on('close', () => {
        delete this.peers[conn.peer];
      });

      conn.on('error', (err: unknown) => {
        console.log('Connection error', err);
        delete this.peers[conn.peer];
      });
    });
  }

  syncData(conn: PeerConnection): void {
    conn.send({
      data: {
        a: 1,
      }, // this.game.objectManager.getObjects(),
    });
  }

  syncDataFromOther(conn: PeerConnection, data: unknown): void {
    // TODO: sync data
    console.log(data);
  }
}
