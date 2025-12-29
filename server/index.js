const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

/**
 * documentStore = {
 *   docId: {
 *     text: "",
 *     users: Map(socketId -> username),
 *     ops: []
 *   }
 * }
 */
const documentStore = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  /* =======================
     JOIN DOCUMENT
  ======================== */
  socket.on("document:join", ({ docId, username }) => {
    socket.join(docId);
    socket.docId = docId;

    if (!documentStore[docId]) {
      documentStore[docId] = {
        text: "",
        users: new Map(),
        ops: []
      };
    }

    documentStore[docId].users.set(socket.id, username);

    socket.emit("document:init", {
      text: documentStore[docId].text,
      version: documentStore[docId].ops.length
    });

    io.to(docId).emit(
      "presence:update",
      Array.from(documentStore[docId].users.values())
    );
  });

  /* =======================
     RECEIVE OPERATION
  ======================== */
  socket.on("document:operation", ({ op, baseVersion }) => {
    const { docId } = socket;
    if (!docId) return;

    const doc = documentStore[docId];

    if (baseVersion !== doc.ops.length) {
      socket.emit("sync:error", { message: "Version mismatch" });
      return;
    }

    let text = doc.text;

    if (op.type === "insert") {
      text =
        text.slice(0, op.index) +
        op.value +
        text.slice(op.index);
    }

    if (op.type === "delete") {
      text =
        text.slice(0, op.index) +
        text.slice(op.index + op.length);
    }

    doc.text = text;
    doc.ops.push(op);

    socket.to(docId).emit("document:operation", {
      op,
      version: doc.ops.length,
      senderId: socket.id
    });
  });

  /* =======================
     DISCONNECT
  ======================== */
  socket.on("disconnect", () => {
    const { docId } = socket;
    if (!docId || !documentStore[docId]) return;

    documentStore[docId].users.delete(socket.id);

    io.to(docId).emit(
      "presence:update",
      Array.from(documentStore[docId].users.values())
    );
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
