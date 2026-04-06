import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [otherUsers, setOtherUsers] = useState({});
  const [myId, setMyId] = useState(null);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isNear, setIsNear] = useState(false);
  const [typingUser, setTypingUser] = useState("")

  function getAvatar(name) {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
}
  // SEND MESSAGE (NO LOCAL STATE ADD)
  const sendMessage = () => {
    if (!input.trim() || !isNear) return;
    socket.emit("sendMessage", { message: input });
    setInput("");
  };

  // MOVEMENT
  useEffect(() => {
    function handleKey(e) {
      setPos((prev) => {
        let { x, y } = prev;

        if (e.key === "ArrowUp") y -= 10;
        if (e.key === "ArrowDown") y += 10;
        if (e.key === "ArrowLeft") x -= 10;
        if (e.key === "ArrowRight") x += 10;

        const newPos = { x, y };
        socket.emit("move", newPos);
        return newPos;
      });
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // PROXIMITY
  useEffect(() => {
    let near = false;

    Object.entries(otherUsers).forEach(([id, user]) => {
      if (id === myId) return;

      const distance = Math.sqrt(
        (pos.x - user.x) ** 2 +
        (pos.y - user.y) ** 2
      );

      if (distance < 80) near = true;
    });

    if (!near) {
    setMessages([]); // clear chat when disconnected
  }
    setIsNear(near);
  }, [pos, otherUsers, myId]);

  // SOCKET LISTENERS
  useEffect(() => {
    socket.on("connect", () => setMyId(socket.id));

    socket.on("allUsers", (users) => setOtherUsers(users));

    socket.on("newUser", (user) => {
      setOtherUsers((prev) => ({ ...prev, [user.id]: user }));
    });

    socket.on("userMoved", (user) => {
      setOtherUsers((prev) => ({ ...prev, [user.id]: user }));
    });

    socket.on("userLeft", (id) => {
      setOtherUsers((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    });

    return () => {
      socket.off("connect");
      socket.off("allUsers");
      socket.off("newUser");
      socket.off("userMoved");
      socket.off("userLeft");
    };
  }, []);

  // ✅ ONLY ONE MESSAGE LISTENER
  useEffect(() => {
    socket.off("receiveMessage");

    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });
  }, []);
useEffect(() => {
  socket.on("userTyping", (data) => {
    setTypingUser(data.name);
  });

  socket.on("userStopTyping", () => {
    setTypingUser("");
  });

  return () => {
    socket.off("userTyping");
    socket.off("userStopTyping");
  };
}, []);


  // JOIN SCREEN
  if (!joined) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="bg-white p-5 rounded">
          <input
            className="border p-2 mb-2 w-full"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-3 py-1 w-full"
            onClick={() => {
              if (!name.trim()) return;
              socket.emit("join", { name });
              setJoined(true);
            }}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-900 relative">

<div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded text-sm">
  👥 {Object.keys(otherUsers).length} Online
</div>
      {/* YOU */}
     {/* 🟦 YOU */}
<div
  className="absolute flex flex-col items-center"
  style={{ left: pos.x, top: pos.y }}
>
  <img
    src={getAvatar(name)}
    className="w-10 h-10 rounded-full border-2 border-white"
  />
  <p className="text-white text-xs mt-1">You</p>
</div>

{/* 🟥 OTHER USERS */}
{Object.entries(otherUsers).map(([id, user]) => {
  if (id === myId) return null;

  return (
    <div
      key={id}
      className="absolute flex flex-col items-center"
      style={{ left: user.x, top: user.y }}
    >
      <img
        src={getAvatar(user.name)}
        className="w-10 h-10 rounded-full border-2 border-white"
      />
      <p className="text-white text-xs mt-1">{user.name}</p>
    </div>
  );
})}

      {/* CHAT */}
     {isNear && (
  <div className="absolute bottom-5 left-5 w-80 bg-white rounded-xl shadow-lg flex flex-col">

    {/* HEADER */}
    <div className="bg-blue-500 text-white px-3 py-2 rounded-t-xl text-sm font-semibold">
      Nearby Chat 💬
    </div>

    {/* MESSAGES */}
    <div className="h-48 overflow-y-auto p-2 space-y-2">
      {messages.map((msg, i) => {
        const isMe = msg.id === myId;

        return (
          <div
            key={i}
            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${
                isMe
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              <div className="text-[10px] font-bold opacity-70">
                {isMe ? "You" : msg.name}
              </div>
              <div>{msg.message}</div>
            </div>
          </div>
        );
      })}
    </div>

    {typingUser && (
  <p className="text-xs text-gray-500 mb-1">
    {typingUser} is typing...
  </p>
)}


    {/* INPUT */}
    <div className="flex border-t">

      <input
        className="flex-1 p-2 text-sm outline-none"
        placeholder="Type message..."
       
        value={input}
       onChange={(e) => {
  setInput(e.target.value);

  socket.emit("typing");

  clearTimeout(window.typingTimeout);

  window.typingTimeout = setTimeout(() => {
    socket.emit("stopTyping");
  }, 1000);
}}
        
       />

      <button
        className="bg-blue-500 text-white px-4"
        onClick={sendMessage}
      >
        Send
      </button>
    </div>

  </div>
)}
    </div>
  );
}

export default App;