// ==========================================
// 서양음악사 브루마블 - 실시간 멀티플레이 서버 (server.js)
// ==========================================

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Room Memory Map
// Key: roomCode (4-digit string)
// Value: { players: [], gameState: {}, chatLogs: [] }
const rooms = new Map();

// 32-Tile Board Configuration Template
const boardTemplate = [
  { index: 0, name: "공공 음악회", composer: "START", type: "start", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 1, name: "아베 마리아", composer: "조스캥", type: "music", era: "baroque", price: 100, upgradePrice: 50, baseToll: 12, tolls: [0,12,24,48,84], owner: null, level: 0,
    trivia: { question: "Q. 다음 설명에 해당하는 조스캥(Josquin)의 대표적인 모테트 작품은? <설명: 소프라노, 알토, 테너, 베이스 성부가 함께 노래하는 무반주 다성부 합창곡으로, 종교적인 내용을 담고 있으며, 노랫말의 각 구절이 모방적으로 진행된다.>", options: ["아베 마리아", "압살롬, 내 아들", "사계", "수상 음악"], answer: "아베 마리아" } },
  { index: 2, name: "사계 '여름'", composer: "비발디", type: "music", era: "baroque", price: 120, upgradePrice: 60, baseToll: 15, tolls: [0,15,30,60,105], owner: null, level: 0,
    trivia: { question: "Q. 비발디의 바이올린 협주곡 \"사계\" 중 '여름'은 사계절의 모습을 표현한 어떤 짧은 시를 바탕으로 만들어졌는가?", options: ["소네트", "연작시", "희곡", "동화"], answer: "소네트" } },
  { index: 3, name: "역사적 찬스", composer: "CHANCE", type: "chance", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 4, name: "토카타와 푸가", composer: "바흐", type: "music", era: "baroque", price: 140, upgradePrice: 70, baseToll: 20, tolls: [0,20,40,80,140], owner: null, level: 0,
    trivia: { question: "Q. 바흐의 오르간 작품 \"토카타와 푸가 라단조\"에서 '화려하고 즉흥적인 성격을 가진 음악 형식'은?", options: ["토카타", "푸가", "소나타", "모테트"], answer: "토카타" } },
  { index: 5, name: "수상 음악", composer: "헨델", type: "music", era: "baroque", price: 160, upgradePrice: 80, baseToll: 25, tolls: [0,25,50,100,175], owner: null, level: 0,
    trivia: { question: "Q. 교과서에서 비발디, 바흐와 함께 대표적인 바로크 시대 작곡가로 소개하며, '수상 음악'이 연주되는 모습이 실린 작곡가는?", options: ["헨델", "하이든", "모차르트", "베토벤"], answer: "헨델" } },
  { index: 6, name: "역사적 찬스", composer: "CHANCE", type: "chance", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 7, name: "바흐 '푸가'", composer: "바흐", type: "music", era: "baroque", price: 180, upgradePrice: 90, baseToll: 30, tolls: [0,30,60,120,210], owner: null, level: 0,
    trivia: { question: "Q. 다음 설명에 해당하는 음악 형식은? <설명: 한 성부에 제시된 주제를 다른 성부에서 모방하며 쫓아가는 음악 형식이다.>", options: ["푸가", "토카타", "오페라", "협주곡"], answer: "푸가" } },
  
  { index: 8, name: "4분 33초의 방", composer: "존 케이지", type: "trap", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 9, name: "하이든 '종달새'", composer: "하이든", type: "music", era: "classical", price: 200, upgradePrice: 100, baseToll: 35, tolls: [0,35,70,140,245], owner: null, level: 0,
    trivia: { question: "Q. 하이든의 현악 4중주 \"종달새\" 제1악장은 도입부에서 이 악기의 소리가 종달새 소리와 비슷하여 붙여진 제목이다. 이 악기는?", options: ["바이올린", "피아노", "첼로", "오르간"], answer: "바이올린" } },
  { index: 10, name: "마술피리", composer: "모차르트", type: "music", era: "classical", price: 220, upgradePrice: 110, baseToll: 40, tolls: [0,40,80,160,280], owner: null, level: 0,
    trivia: { question: "Q. 모차르트의 오페라 \"마술피리\"에서 '이성의 세계를 지배하는 자라스트로'와 대립하는 '마법의 세계를 지배하는' 인물은?", options: ["밤의 여왕", "파미나", "타미노", "파파게노"], answer: "밤의 여왕" } },
  { index: 11, name: "역사적 찬스", composer: "CHANCE", type: "chance", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 12, name: "합창 교향곡", composer: "베토벤", type: "music", era: "classical", price: 240, upgradePrice: 120, baseToll: 45, tolls: [0,45,90,180,315], owner: null, level: 0,
    trivia: { question: "Q. 베토벤의 \"합창\" 교향곡 제4악장에서 인류애를 주제로 한 어떤 시인의 시를 노랫말로 삼았는가?", options: ["실러", "베를렌", "입센", "호프만"], answer: "실러" } },
  { index: 13, name: "황제 4중주", composer: "하이든", type: "music", era: "classical", price: 260, upgradePrice: 130, baseToll: 50, tolls: [0,50,100,200,350], owner: null, level: 0,
    trivia: { question: "Q. 하이든의 \"황제\"나 \"종달새\"와 같이 '고전주의 시대에 가장 성행했던 실내악 연주 형태'로, 2대의 바이올린과 비올라, 첼로가 함께 연주하는 형태는?", options: ["현악 4중주", "합창", "독주", "독창"], answer: "현악 4중주" } },
  { index: 14, name: "역사적 찬스", composer: "CHANCE", type: "chance", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 15, name: "운명 교향곡", composer: "베토벤", type: "music", era: "classical", price: 280, upgradePrice: 140, baseToll: 55, tolls: [0,55,110,220,385], owner: null, level: 0,
    trivia: { question: "Q. 다음 중 교과서에서 베토벤의 작품이자 교향곡으로 명시된 곡은?", options: ["운명 교향곡", "놀람 교향곡", "수상 음악", "사계"], answer: "운명 교향곡" } },
  
  { index: 16, name: "타임머신", composer: "WARP", type: "warp", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 17, name: "환상 즉흥곡", composer: "쇼팽", type: "music", era: "romantic", price: 300, upgradePrice: 150, baseToll: 60, tolls: [0,60,120,240,420], owner: null, level: 0,
    trivia: { question: "Q. 다음 설명에 해당하는 악곡의 종류는? <설명: 순간적으로 떠오른 즉흥적인 악상에 따라 자유롭게 작곡한 악곡이다.>", options: ["즉흥곡", "소나타", "모테트", "협주곡"], answer: "즉흥곡" } },
  { index: 18, name: "백조의 호수", composer: "차이콥스키", type: "music", era: "romantic", price: 310, upgradePrice: 155, baseToll: 62, tolls: [0,62,124,248,434], owner: null, level: 0,
    trivia: { question: "Q. 다음 중 교과서에서 차이콥스키의 작품 중 '발레 음악'으로 명시되어 있는 곡은?", options: ["백조의 호수", "마술피리", "사계", "아베 마리아"], answer: "백조의 호수" } },
  { index: 19, name: "역사적 찬스", composer: "CHANCE", type: "chance", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 20, name: "호두까기 인형", composer: "차이콥스키", type: "music", era: "romantic", price: 320, upgradePrice: 160, baseToll: 65, tolls: [0,65,130,260,455], owner: null, level: 0,
    trivia: { question: "Q. 차이콥스키의 발레 모음곡 \"호두까기 인형\"은 어떤 작가의 동화를 바탕으로 만들어졌는가?", options: ["호프만", "입센", "베를렌", "실러"], answer: "호프만" } },
  { index: 21, name: "페르귄트", composer: "그리그", type: "music", era: "romantic", price: 340, upgradePrice: 170, baseToll: 70, tolls: [0,70,140,280,490], owner: null, level: 0,
    trivia: { question: "Q. 그리그의 \"페르 귄트 모음곡\" 중 '산왕의 궁전에서'의 음악적 진행 특징은?", options: ["느리고 작은 소리로 시작하여 점점 빨라지면서 소리가 커진다.", "박수로 한 마디의 리듬을 반복하되 조금씩 어긋나게 연주한다.", "한 사람이 두 개의 목소리를 동시에 내는 기법이다.", "흉성과 두성을 급격하게 교차하며 반복한다."], answer: "느리고 작은 소리로 시작하여 점점 빨라지면서 소리가 커진다." } },
  { index: 22, name: "역사적 찬스", composer: "CHANCE", type: "chance", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 23, name: "빗방울 전주곡", composer: "쇼팽", type: "music", era: "romantic", price: 360, upgradePrice: 180, baseToll: 75, tolls: [0,75,150,300,525], owner: null, level: 0,
    trivia: { question: "Q. 다음 중 교과서에 수록된 쇼팽의 작품 목록에 없는 곡은?", options: ["빗방울 전주곡", "이별의 곡", "영웅 폴로네즈", "수상 음악"], answer: "수상 음악" } },
  
  { index: 24, name: "역사적 찬스 코너", composer: "CHANCE", type: "chance-corner", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 25, name: "드뷔시 '달빛'", composer: "드뷔시", type: "music", era: "modern", price: 400, upgradePrice: 200, baseToll: 90, tolls: [0,90,180,360,630], owner: null, level: 0,
    trivia: { question: "Q. 드뷔시의 피아노 모음곡 \"베르가마스크\" 중 3번째 곡인 '달빛'은 어떤 시인의 시에서 영감을 얻었는가?", options: ["베를렌", "실러", "입센", "호프만"], answer: "베를렌" } },
  { index: 26, name: "달에 홀린 피에로", composer: "쇤베르크", type: "music", era: "modern", price: 420, upgradePrice: 210, baseToll: 95, tolls: [0,95,190,380,665], owner: null, level: 0,
    trivia: { question: "Q. 쇤베르크의 \"달에 홀린 피에로\"에서 특징적으로 사용된, 말과 노래의 중간에 해당하는 창법은?", options: ["슈프레히슈티메", "흐미", "요들", "파두"], answer: "슈프레히슈티메" } },
  { index: 27, name: "역사적 찬스", composer: "CHANCE", type: "chance", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 28, name: "존 케이지 '4분 33초'", composer: "케이지", type: "music", era: "modern", price: 440, upgradePrice: 220, baseToll: 100, tolls: [0,100,200,400,700], owner: null, level: 0,
    trivia: { question: "Q. 존 케이지의 \"4분 33초\"와 같이 '창작과 연주에 우연성의 원리를 적용한 음악'의 사조는?", options: ["우연성 음악", "원시주의 음악", "전자 음악", "최소 음악"], answer: "우연성 음악" } },
  { index: 29, name: "소년의 노래", composer: "슈토크하우젠", type: "music", era: "modern", price: 460, upgradePrice: 230, baseToll: 110, tolls: [0,110,220,440,770], owner: null, level: 0,
    trivia: { question: "Q. 슈토크하우젠의 \"소년의 노래\"와 같이 '전자 매체를 사용하여 소리를 생성하거나 변형하여 만드는 음악'의 종류는?", options: ["전자 음악", "우연성 음악", "최소 음악", "원시주의 음악"], answer: "전자 음악" } },
  { index: 30, name: "역사적 찬스", composer: "CHANCE", type: "chance", era: null, price: 0, baseToll: 0, tolls: [0,0,0,0,0] },
  { index: 31, name: "클래핑 뮤직", composer: "스티브 라이히", type: "music", era: "modern", price: 480, upgradePrice: 240, baseToll: 120, tolls: [0,120,240,480,840], owner: null, level: 0,
    trivia: { question: "Q. 다음 설명에 해당하는 스티브 라이히의 작품은? <설명: 두 명의 연주자가 박수로 한 마디의 리듬을 반복하되 조금씩 어긋나게 연주하는 음악이다.>", options: ["클래핑 뮤직", "소년의 노래", "4분 33초", "달에 홀린 피에로"], answer: "클래핑 뮤직" } }
];

// Chance Card List
const serverChanceCards = [
  { title: "그레고리오의 계시", description: "새로운 4선 기보법을 창안하여 교회로부터 격려금을 받았습니다! 즉시 150골드를 획득합니다.", type: "gold", amount: 150 },
  { title: "베토벤의 시련", description: "청각 장애 극복을 위한 요양비용으로 큰 지출이 발생했습니다. 100골드를 은행에 지불합니다.", type: "gold", amount: -100 },
  { title: "악보 인쇄 혁명", description: "활자 인쇄 악보집 '오데카톤'이 대성공을 거두었습니다! 보너스 200골드를 받습니다.", type: "gold", amount: 200 },
  { title: "바흐의 은총", description: "음악의 신 바흐의 가호를 받아 START(공공 음악회) 칸으로 즉시 이동합니다.", type: "warp", target: 0 },
  { title: "시공의 붕괴", description: "우주 여행을 할 수 있는 '타임머신' 칸으로 즉시 이동합니다.", type: "warp", target: 16 },
  { title: "기부 음악회 후원", description: "가난한 예술가들을 지원하기 위한 기부 음악회를 개최합니다. 기부금 100골드를 냅니다.", type: "gold", amount: -100 },
  { title: "쇤베르크의 불협화음", description: "전통 조성을 파괴하는 난해한 12음 기법을 듣고 깜짝 놀랐습니다. 정신적 충격으로 3칸 뒤로 이동합니다.", type: "step", steps: -3 }
];

// Helper: Generate a unique room code
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Create Room
  socket.on("createRoom", ({ playerName }) => {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const newRoom = {
      code: roomCode,
      players: [
        {
          socketId: socket.id,
          name: playerName,
          color: "#ff3366", // Red
          avatar: "fa-violin",
          gold: 1500,
          estate: 0,
          position: 0,
          isTrapped: false,
          trappedTurns: 0,
          hasWarpPending: false,
          properties: [],
          isHost: true
        }
      ],
      gameState: {
        status: "waiting",
        activePlayerIdx: 0,
        turnCount: 1,
        boardTiles: JSON.parse(JSON.stringify(boardTemplate)) // Deep copy
      },
      chatLogs: []
    };

    rooms.set(roomCode, newRoom);
    socket.join(roomCode);
    
    socket.emit("joinSuccess", { roomCode, playerIndex: 0 });
    io.to(roomCode).emit("roomStateUpdate", newRoom);
    console.log(`Room created: ${roomCode} by ${playerName}`);
  });

  // Join Room
  socket.on("joinRoom", ({ playerName, roomCode }) => {
    const code = roomCode.toUpperCase();
    if (!rooms.has(code)) {
      socket.emit("joinError", "방이 존재하지 않습니다.");
      return;
    }

    const room = rooms.get(code);
    if (room.gameState.status !== "waiting") {
      socket.emit("joinError", "이미 게임이 시작되었습니다.");
      return;
    }

    if (room.players.length >= 4) {
      socket.emit("joinError", "방이 꽉 찼습니다. (최대 4인)");
      return;
    }

    // Configure client profile based on index
    const index = room.players.length;
    const colors = ["#ff3366", "#00e5ff", "#ffb300", "#e040fb"]; // P1, P2, P3, P4
    const avatars = ["fa-violin", "fa-drum", "fa-music", "fa-guitar"];
    
    const newPlayer = {
      socketId: socket.id,
      name: playerName,
      color: colors[index],
      avatar: avatars[index],
      gold: 1500,
      estate: 0,
      position: 0,
      isTrapped: false,
      trappedTurns: 0,
      hasWarpPending: false,
      properties: [],
      isHost: false
    };

    room.players.push(newPlayer);
    socket.join(code);
    
    socket.emit("joinSuccess", { roomCode: code, playerIndex: index });
    io.to(code).emit("roomStateUpdate", room);
    
    // Server chat join notify
    sendSystemChatMessage(code, `${playerName} 님이 입장하셨습니다.`);
    console.log(`User ${playerName} joined Room ${code}`);
  });

  // Start Game
  socket.on("startGame", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !player.isHost) return;

    room.gameState.status = "playing";
    room.gameState.activePlayerIdx = 0;
    room.gameState.turnCount = 1;

    io.to(roomCode).emit("gameStart");
    io.to(roomCode).emit("roomStateUpdate", room);
    sendSystemChatMessage(roomCode, "서양음악사 브루마블 게임이 시작되었습니다!");
  });

  // Chat message
  socket.on("sendChat", ({ roomCode, message }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const chat = {
      sender: player.name,
      color: player.color,
      message: message,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })
    };

    room.chatLogs.push(chat);
    io.to(roomCode).emit("chatReceived", chat);
  });

  // Dice Roll Handler
  socket.on("rollDice", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return; // Not their turn

    // Calculate Roll
    const val1 = Math.floor(Math.random() * 6) + 1;
    const val2 = Math.floor(Math.random() * 6) + 1;
    const total = val1 + val2;

    const isDouble = val1 === val2;

    if (isDouble && !activeP.isTrapped) {
      room.gameState.doubleCount = (room.gameState.doubleCount || 0) + 1;
    } else {
      room.gameState.doubleCount = 0;
    }

    // Save initial state for movement tracking
    const oldPosition = activeP.position;
    
    // Update player position
    activeP.position = (activeP.position + total) % 32;

    // Check passed START (START is Index 0)
    // If the new position is numerically less than the old position, the player wrapped around START
    let passedStart = false;
    if (activeP.position < oldPosition) {
      passedStart = true;
      activeP.gold += 200;
    }

    // Broadcast roll animation details to everyone
    io.to(roomCode).emit("diceRolled", {
      playerIndex: room.gameState.activePlayerIdx,
      rolls: [val1, val2],
      total: total,
      isDouble: isDouble,
      newPosition: activeP.position,
      passedStart: passedStart
    });

    sendSystemChatMessage(roomCode, `${activeP.name} 님이 주사위를 던졌습니다! (${val1} + ${val2} = ${total})`);
  });

  // Trap escape payment
  socket.on("payTrapEscape", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    if (activeP.gold >= 100) {
      activeP.gold -= 100;
      activeP.isTrapped = false;
      activeP.trappedTurns = 0;
      
      sendSystemChatMessage(roomCode, `${activeP.name} 님이 침묵 탈옥금 100골드를 납부하셨습니다.`);
      io.to(roomCode).emit("roomStateUpdate", room);
      socket.emit("trapEscapeSuccess");
    }
  });

  // Roll escape try (trap)
  socket.on("rollTrapEscape", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    const val1 = Math.floor(Math.random() * 6) + 1;
    const val2 = Math.floor(Math.random() * 6) + 1;
    const isDouble = val1 === val2;

    io.to(roomCode).emit("diceRolled", {
      playerIndex: room.gameState.activePlayerIdx,
      rolls: [val1, val2],
      total: val1 + val2,
      isDouble: isDouble,
      newPosition: activeP.position,
      passedStart: false,
      isEscapeRoll: true
    });

    if (isDouble) {
      activeP.isTrapped = false;
      activeP.trappedTurns = 0;
      activeP.position = (activeP.position + val1 + val2) % 32;
      
      sendSystemChatMessage(roomCode, `🎉 더블(${val1}) 등장! ${activeP.name} 님이 4분 33초의 방을 무료 탈출했습니다.`);
      
      // Delay response to sync animation
      setTimeout(() => {
        io.to(roomCode).emit("roomStateUpdate", room);
        io.to(roomCode).emit("resolveLandedTile");
      }, 3500);
    } else {
      activeP.trappedTurns--;
      sendSystemChatMessage(roomCode, `${activeP.name} 님이 탈출에 실패했습니다. (주사위: ${val1}, ${val2})`);
      
      if (activeP.trappedTurns <= 0) {
        activeP.isTrapped = false;
        sendSystemChatMessage(roomCode, `${activeP.name} 님이 다음 턴에 자동 석방됩니다.`);
      }
      
      setTimeout(() => {
        io.to(roomCode).emit("roomStateUpdate", room);
        endTurn(roomCode);
      }, 2000);
    }
  });

  // Land complete, resolve tile actions
  socket.on("clientFinishedMoving", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    const tile = room.gameState.boardTiles[activeP.position];

    // Trigger action on active client
    socket.emit("triggerTileAction", { tile });
  });

  // Buy Property
  socket.on("buyProperty", ({ roomCode, tileIndex, level, isFree }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    const tile = room.gameState.boardTiles[tileIndex];
    const cost = isFree ? 0 : tile.upgradePrice;

    if (activeP.gold >= cost) {
      activeP.gold -= cost;
      tile.owner = room.gameState.activePlayerIdx;
      tile.level = level;

      if (!activeP.properties.includes(tileIndex)) {
        activeP.properties.push(tileIndex);
      }

      const lvNames = ["공터", "간이 무대", "공작의 음악실", "대형 콘서트홀", "월드 스타디움 (랜드마크)"];
      sendSystemChatMessage(roomCode, `${activeP.name} 님이 ${tile.name}에 '${lvNames[level]}'을(를) 완공했습니다.`);

      // Sync and next turn
      io.to(roomCode).emit("roomStateUpdate", room);
      endTurn(roomCode);
    }
  });

  // Quiz Failure
  socket.on("quizFailed", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    // Penalty gold
    activeP.gold -= 50;
    if (activeP.gold < 0) activeP.gold = 0;
    
    sendSystemChatMessage(roomCode, `${activeP.name} 님이 퀴즈 정답 맞추기에 실패하여 50골드 페널티를 납부했습니다.`);
    
    // Check bankrupt
    checkPlayerBankruptcy(roomCode, room.gameState.activePlayerIdx);

    io.to(roomCode).emit("roomStateUpdate", room);
    endTurn(roomCode);
  });

  // Upgrade Property
  socket.on("upgradeProperty", ({ roomCode, tileIndex }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    const tile = room.gameState.boardTiles[tileIndex];
    if (tile.owner !== room.gameState.activePlayerIdx) return;
    
    const nextLevel = tile.level + 1;
    if (nextLevel > 4) return; // Max level reached

    const cost = tile.upgradePrice;
    if (activeP.gold >= cost) {
      activeP.gold -= cost;
      tile.level = nextLevel;

      const lvNames = ["공터", "간이 무대", "공작의 음악실", "대형 콘서트홀", "월드 스타디움 (랜드마크)"];
      sendSystemChatMessage(roomCode, `${activeP.name} 님이 ${tile.name} 무대를 '${lvNames[nextLevel]}'으로 업그레이드했습니다.`);

      io.to(roomCode).emit("roomStateUpdate", room);
      endTurn(roomCode);
    }
  });

  // Pay Toll Only (No Takeover)
  socket.on("payTollOnly", ({ roomCode, tileIndex }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    const tile = room.gameState.boardTiles[tileIndex];
    const ownerIndex = tile.owner;
    const owner = room.players[ownerIndex];
    const toll = tile.tolls[tile.level];

    // Transfer gold
    const actualToll = Math.min(activeP.gold, toll);
    activeP.gold -= actualToll;
    owner.gold += actualToll;

    sendSystemChatMessage(roomCode, `${activeP.name} 님이 ${owner.name} 님에게 통행료 ${actualToll}골드를 납부하셨습니다.`);

    // Check bankrupt
    checkPlayerBankruptcy(roomCode, room.gameState.activePlayerIdx);

    io.to(roomCode).emit("closeTollModal");
    io.to(roomCode).emit("roomStateUpdate", room);
    endTurn(roomCode);
  });

  // Pay Toll and Takeover Property
  socket.on("payTollAndTakeover", ({ roomCode, tileIndex }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    const tile = room.gameState.boardTiles[tileIndex];
    const ownerIndex = tile.owner;
    const owner = room.players[ownerIndex];
    const toll = tile.tolls[tile.level];

    // 1. Pay Toll
    const actualToll = Math.min(activeP.gold, toll);
    activeP.gold -= actualToll;
    owner.gold += actualToll;

    sendSystemChatMessage(roomCode, `${activeP.name} 님이 ${owner.name} 님에게 통행료 ${actualToll}골드를 납부하셨습니다.`);

    // Check bankrupt from toll payment
    checkPlayerBankruptcy(roomCode, room.gameState.activePlayerIdx);

    // 2. Perform Takeover if active player is not bankrupt
    if (activeP.gold > 0) {
      const originalValue = tile.price + (tile.level - 1) * tile.upgradePrice;
      const takeoverCost = originalValue * 2;

      if (activeP.gold >= takeoverCost) {
        activeP.gold -= takeoverCost;
        owner.gold += takeoverCost;

        // Transfer ownership
        owner.properties = owner.properties.filter(idx => idx !== tileIndex);
        activeP.properties.push(tileIndex);

        tile.owner = room.gameState.activePlayerIdx;

        sendSystemChatMessage(roomCode, `💳 ${activeP.name} 님이 ${owner.name} 님의 ${tile.name} 무대를 ${takeoverCost}골드에 강제 인수했습니다!`);
        
        io.to(roomCode).emit("propertyTakeoverNotification", {
          buyerIdx: room.gameState.activePlayerIdx,
          sellerIdx: ownerIndex,
          tileIndex: tileIndex,
          cost: takeoverCost
        });
      }
    }

    io.to(roomCode).emit("closeTollModal");
    io.to(roomCode).emit("roomStateUpdate", room);
    endTurn(roomCode);
  });

  // Skip buy/upgrade
  socket.on("declineBuy", ({ roomCode }) => {
    endTurn(roomCode);
  });

  // Trap room landing complete
  socket.on("landTrapRoom", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    activeP.isTrapped = true;
    activeP.trappedTurns = 3;

    io.to(roomCode).emit("roomStateUpdate", room);
    endTurn(roomCode);
  });

  // Warp machine setup complete
  socket.on("landWarpMachine", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    activeP.hasWarpPending = true;

    io.to(roomCode).emit("roomStateUpdate", room);
    endTurn(roomCode);
  });

  // Teleport warp selection
  socket.on("warpPlayer", ({ roomCode, targetIndex }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    const oldPos = activeP.position;
    activeP.position = targetIndex;
    activeP.hasWarpPending = false;

    // Check if crossed START
    let passedStart = false;
    if (targetIndex < oldPos) {
      passedStart = true;
      activeP.gold += 200;
      sendSystemChatMessage(roomCode, `${activeP.name} 님이 시간의 관문을 넘어 200골드를 획득하셨습니다.`);
    }

    sendSystemChatMessage(roomCode, `${activeP.name} 님이 ${room.gameState.boardTiles[targetIndex].name} 칸으로 우주 점프했습니다.`);
    
    io.to(roomCode).emit("roomStateUpdate", room);

    // Resolve landing directly
    socket.emit("triggerTileAction", { tile: room.gameState.boardTiles[targetIndex] });
  });

  // Draw Chance Card
  socket.on("drawChance", ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const activeP = room.players[room.gameState.activePlayerIdx];
    if (activeP.socketId !== socket.id) return;

    // Draw card
    const cardIdx = Math.floor(Math.random() * serverChanceCards.length);
    const card = serverChanceCards[cardIdx];

    let actionMsg = "";
    if (card.type === "gold") {
      activeP.gold += card.amount;
      if (activeP.gold < 0) activeP.gold = 0;
      actionMsg = card.amount > 0 ? `${Math.abs(card.amount)}골드 획득!` : `${Math.abs(card.amount)}골드 차감.`;
      
      // Check bankrupt
      checkPlayerBankruptcy(roomCode, room.gameState.activePlayerIdx);
    } else if (card.type === "warp") {
      // Warp directly
      const oldPos = activeP.position;
      activeP.position = card.target;
      if (card.target < oldPos) {
        activeP.gold += 200;
      }
      if (card.target === 16) {
        activeP.hasWarpPending = true;
      }
      actionMsg = `${room.gameState.boardTiles[card.target].name} 칸으로 즉시 이동!`;
    } else if (card.type === "step") {
      // Step back/forward
      activeP.position = (activeP.position + card.steps + 32) % 32;
      actionMsg = `${Math.abs(card.steps)}칸 뒤로 이동!`;
    }

    sendSystemChatMessage(roomCode, `🃏 찬스 발동 [${card.title}]: ${card.description}`);

    io.to(roomCode).emit("chanceDrawn", { card, actionMsg });
  });

  // End Chance turn
  socket.on("finishChanceTurn", ({ roomCode }) => {
    io.to(roomCode).emit("closeChanceModal");
    endTurn(roomCode);
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find room they were in
    for (const [code, room] of rooms.entries()) {
      const pIdx = room.players.findIndex(p => p.socketId === socket.id);
      if (pIdx !== -1) {
        const pName = room.players[pIdx].name;
        const isHost = room.players[pIdx].isHost;

        // Remove player
        room.players.splice(pIdx, 1);
        sendSystemChatMessage(code, `${pName} 님이 퇴장하셨습니다.`);

        if (room.players.length === 0) {
          // Delete room if empty
          rooms.delete(code);
          console.log(`Room ${code} deleted.`);
        } else {
          // Migrate host if host left
          if (isHost) {
            room.players[0].isHost = true;
            sendSystemChatMessage(code, `${room.players[0].name} 님이 방장이 되었습니다.`);
          }
          
          // Re-index properties owners if game in progress to avoid socket id sync bugs
          // (Our properties list owners are indexes 0-3. If we splice room.players, indices shift.
          // To keep it simple, we check if playing and announce game end if someone leaves mid-game).
          if (room.gameState.status === "playing") {
            room.gameState.status = "finished";
            sendSystemChatMessage(code, `⚠️ 플레이어가 이탈하여 게임이 조기 종료되었습니다.`);
            io.to(code).emit("gameAborted", `${pName} 님의 탈퇴로 인한 조기 종료.`);
          }

          io.to(code).emit("roomStateUpdate", room);
        }
        break;
      }
    }
  });
});

// Helper: Send System message in room chat
function sendSystemChatMessage(roomCode, message) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const chat = {
    sender: "SYSTEM",
    color: "#ffaa00",
    message: message,
    timestamp: new Date().toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })
  };

  room.chatLogs.push(chat);
  io.to(roomCode).emit("chatReceived", chat);
}

// End Turn Core logic
function endTurn(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const activeP = room.players[room.gameState.activePlayerIdx];

  // 1. If player rolled 3 doubles, send to jail (4'33" room, Index 8)
  if (room.gameState.doubleCount >= 3) {
    room.gameState.doubleCount = 0;
    activeP.position = 8;
    activeP.isTrapped = true;
    activeP.trappedTurns = 3;
    sendSystemChatMessage(roomCode, `🚨 더블 3회 연속 달성! ${activeP.name} 님이 과도한 시간 질주로 4분 33초의 방에 갇혔습니다.`);
  } 
  // 2. If double rolled, keep turn (unless they went bankrupt, or trapped on this turn)
  else if (room.gameState.doubleCount > 0 && activeP.gold > 0 && !activeP.isTrapped) {
    sendSystemChatMessage(roomCode, `🎲 더블! ${activeP.name} 님에게 주사위를 한 번 더 던질 기회가 주어집니다.`);
    io.to(roomCode).emit("roomStateUpdate", room);
    return;
  }

  // Proceed to next player
  room.gameState.doubleCount = 0; // Reset double count

  let loopCount = 0;
  let nextIdx = room.gameState.activePlayerIdx;
  
  do {
    nextIdx = (nextIdx + 1) % room.players.length;
    loopCount++;
    // Skip players with 0 gold (bankrupt)
  } while (room.players[nextIdx].gold <= 0 && loopCount < room.players.length);

  room.gameState.activePlayerIdx = nextIdx;

  // If we wrapped back to index 0, increment turn count
  if (nextIdx === 0) {
    room.gameState.turnCount++;
    if (room.gameState.turnCount > 30) {
      declareTimeGameOver(roomCode);
      return;
    }
  }

  // Double check if only 1 player remains active (others bankrupt)
  const activePlayers = room.players.filter(p => p.gold > 0);
  if (activePlayers.length === 1) {
    declareWinner(roomCode, activePlayers[0]);
    return;
  }

  io.to(roomCode).emit("roomStateUpdate", room);
}

// Bankruptcy liquidator
function checkPlayerBankruptcy(roomCode, playerIndex) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const p = room.players[playerIndex];
  if (p.gold <= 0) {
    p.gold = 0;
    
    // Liquidate properties
    if (p.properties.length > 0) {
      sendSystemChatMessage(roomCode, `⚠️ ${p.name} 님이 파산 위기로 무대를 반값 매각합니다.`);
      p.properties.sort((a, b) => room.gameState.boardTiles[a].price - room.gameState.boardTiles[b].price);
      
      while (p.gold <= 0 && p.properties.length > 0) {
        const tileIdx = p.properties.pop();
        const tile = room.gameState.boardTiles[tileIdx];
        const totalVal = tile.price + (tile.level - 1) * tile.upgradePrice;
        const refund = Math.floor(totalVal / 2);

        tile.owner = null;
        tile.level = 0;
        p.gold += refund;

        sendSystemChatMessage(roomCode, `🪵 ${tile.name} 무대가 ${refund}골드에 강제 매각되었습니다.`);
      }
    }

    if (p.gold <= 0) {
      sendSystemChatMessage(roomCode, `💥 ${p.name} 님이 결국 파산(Bankrupt)하였습니다.`);
    }
  }
}

function declareWinner(roomCode, winner) {
  const room = rooms.get(roomCode);
  room.gameState.status = "finished";
  
  io.to(roomCode).emit("gameOver", {
    winnerName: winner.name,
    reason: `나머지 플레이어의 파산으로 인한 ${winner.name} 님의 최종 대승리!`
  });
}

function declareTimeGameOver(roomCode) {
  const room = rooms.get(roomCode);
  room.gameState.status = "finished";

  // Calculate total assets for everyone
  let winner = null;
  let maxAssets = -1;

  room.players.forEach((p, idx) => {
    // calculate estate value
    let estateVal = 0;
    p.properties.forEach((tileIdx) => {
      const tile = room.gameState.boardTiles[tileIdx];
      estateVal += tile.price + (tile.level - 1) * tile.upgradePrice;
    });
    p.estate = estateVal;
    const total = p.gold + p.estate;

    if (total > maxAssets) {
      maxAssets = total;
      winner = p;
    }
  });

  io.to(roomCode).emit("gameOver", {
    winnerName: winner.name,
    reason: `30턴 시간 초과! 최종 총자산 ${maxAssets.toLocaleString()}골드를 보유한 ${winner.name} 님의 최종 승리!`
  });
}

// Start Server Listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
