const socket = io('http://localhost:5000');
let currentUser;

const joinBtn = document.getElementById('joinBtn');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');
const messagesContainer = document.getElementById('messages');

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

const addMessageToChat = (message, isCurrentUser) => {
  const userId = `user-${message.user}`;

  // Check if an element with the ID already exists
  let messageLiveElement = document.getElementById(userId);

  if (messageLiveElement) {
    console.log('Live element exists');
    // If the element exists, hide it
    messageLiveElement.remove();
  }

  const messageElement = document.createElement('div');
  messageElement.classList.add('message', isCurrentUser ? 'user' : 'other');
  messageElement.textContent = `${message.user}: ${message.text}`;
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll to the latest message
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
  socket.emit('sendLiveMessage', message, () => {
  });
  //   }
};

joinBtn.addEventListener('click', () => {
  currentUser = document.getElementById('nameInput').value.trim();
  const room = document.getElementById('roomInput').value.trim();

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
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') sendMessage();
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
