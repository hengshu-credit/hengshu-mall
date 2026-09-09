const net = require('node:net');
function record(type, body) {
  const padding = (8 - body.length % 8) % 8;
  const header = Buffer.alloc(8);
  header[0] = 1;
  header[1] = type;
  header.writeUInt16BE(1, 2);
  header.writeUInt16BE(body.length, 4);
  header[6] = padding;
  return Buffer.concat([header, body, Buffer.alloc(padding)]);
}
function length(value) {
  if (value < 128) return Buffer.from([value]);
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE((value | 0x80000000) >>> 0);
  return buffer;
}
module.exports = function fastcgi(params) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(9003, '127.0.0.1');
    let buffer = Buffer.alloc(0), output = '', error = '', done = false;
    socket.setTimeout(30000, () => socket.destroy(new Error('FastCGI timeout')));
    socket.on('error', reject);
    socket.on('end', () => { if (!done) reject(new Error('FastCGI ended without END_REQUEST')); });
    socket.on('connect', () => {
      const pairs = Object.entries({ REQUEST_METHOD: 'GET', SERVER_PROTOCOL: 'HTTP/1.1', SERVER_NAME: 'localhost', SERVER_PORT: '80', REMOTE_ADDR: '127.0.0.1', ...params }).flatMap(([key, value]) => {
        const k = Buffer.from(key), v = Buffer.from(value);
        return [length(k.length), length(v.length), k, v];
      });
      socket.write(Buffer.concat([record(1, Buffer.from([0, 1, 0, 0, 0, 0, 0, 0])), record(4, Buffer.concat(pairs)), record(4, Buffer.alloc(0)), record(5, Buffer.alloc(0))]));
    });
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const size = buffer.readUInt16BE(4), padding = buffer[6], type = buffer[1];
        if (buffer.length < 8 + size + padding) break;
        const body = buffer.subarray(8, 8 + size);
        buffer = buffer.subarray(8 + size + padding);
        if (type === 6) output += body.toString();
        if (type === 7) error += body.toString();
        if (type === 3) {
          done = true;
          socket.end();
          if (error) reject(new Error(error));
          else resolve(output.slice(output.indexOf('\r\n\r\n') + 4));
        }
      }
    });
  });
};
