try {
  //   const socket = io('http://localhost:5000');
  const socket = io('https://customer-care-live-chat.onrender.com');
  let currentUser;

  const titleHeader = document.getElementById('titleHeader');
  const joinBtn = document.getElementById('joinBtn');
  const sendBtn = document.getElementById('sendBtn');
  const messageInput = document.getElementById('messageInput');
  const messagesContainer = document.getElementById('messages');
  const nameInput = document.getElementById('nameInput');
  const roomInput = document.getElementById('roomInput');
  const notificationSound = new Audio('notification.mp3');

  function demoSetup() {
    nameInput.value = Date.now();
    roomInput.value = 'testing testing';
    joinRoom();
  }

  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  function joinRoom() {
    currentUser = nameInput.value.trim();
    const room = roomInput.value.trim();

    if (!currentUser || !room) {
      alert('Both name and room are required to join!');
      return;
    }

    socket.emit('join', { name: currentUser, room }, (error) => {
      if (error) {
        alert(error);
      } else {
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus(); // Set focus to message input after joining
      }
    });
  }

  const addMessageToChat = (message, isCurrentUser) => {
    const userId = `user-${message.user}`;

    // Check if an element with the ID already exists
    let messageLiveElement = document.getElementById(userId);

    if (messageLiveElement) {
      // If the element exists, hide it
      messageLiveElement.remove();
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message', isCurrentUser ? 'user' : 'other');
    messageElement.textContent = `${message.user}: ${message.text}`;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll to the latest message

    if (message.user !== 'admin') notificationSound.play();
  };

  const updateLiveMessage = (message, isCurrentUser) => {
    if (!isCurrentUser) {
      // Generate the ID based on the user ID
      const userId = `user-${message.user}`;

      // Check if an element with the ID already exists
      let messageLiveElement = document.getElementById(userId);

      if (!messageLiveElement) {
        // Create a new element
        messageLiveElement = document.createElement('div');
        messageLiveElement.id = userId;
        messageLiveElement.className = 'typing';
      }

      if (message.text == '') {
        messageLiveElement.remove();
        return;
      }

      messageLiveElement.classList.add(
        'message',
        isCurrentUser ? 'user' : 'other'
      );
      messageLiveElement.textContent = `${message.user}(typing...): ${message.text}`;

      messagesContainer.appendChild(messageLiveElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll to the latest message
    }
  };

  const sendMessage = () => {
    const message = messageInput.value.trim();
    if (message) {
      socket.emit('sendMessage', message, () => {
        messageInput.value = '';
      });
    }
  };

  const sendLiveMessage = () => {
    const message = messageInput.value.trim();
    socket.emit('sendLiveMessage', message, () => {});
    //   }
  };

  joinBtn.addEventListener('click', async () => {
    joinRoom();
  });

  sendBtn.addEventListener('click', sendMessage);

  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage();
  });

  titleHeader.addEventListener('click', () => {
    demoSetup();
  });

  //Throttled - Best to use in production
  // messageInput.addEventListener(
  //   'input',
  //   debounce((event) => {
  //     sendLiveMessage();
  //   }, 300)
  // );

  //No throttling
  messageInput.addEventListener('input', (event) => {
    sendLiveMessage();
  });

  socket.on('message', (message) => {
    addMessageToChat(message, message.user === currentUser);
  });

  socket.on('liveMessage', (message) => {
    updateLiveMessage(message, message.user === currentUser);
  });

  socket.on('reaction', ({ messageId, user, reaction }) => {
    console.log(`${user} reacted to message ${messageId}: ${reaction}`);
  });
} catch (e) {
  alert(e.message);
}
