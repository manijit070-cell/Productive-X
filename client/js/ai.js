import { api } from './api.js';
import { showToast } from './components/ui.js';

export function initAI() {
  // UI Elements
  const botIcon = document.getElementById('ai-chat-bot-icon');
  const chatPanel = document.getElementById('ai-chat-panel');
  const closeChat = document.getElementById('btn-close-chat');
  const bubbleMsg = document.getElementById('ai-chat-bubble-msg');
  const sendBtn = document.getElementById('ai-chat-send');
  const chatInput = document.getElementById('ai-chat-input');
  const messagesDiv = document.getElementById('ai-chat-messages');
  const micBtn = document.getElementById('ai-chat-mic');

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let isListening = false;
  let manualVoice = false;
  let isSpeaking = false;
  let wakeWordTriggered = false;
  let recognition = null;
  let manualVoiceTimeout = null;
  let currentUtterance = null; // Fix Chrome GC bug for speech synthesis
  let restartTimeout = null;
  const WAKE_WORDS = ['sage', 'page', 'stage', 'cage', 'gauge', 'say'];

  function playBeep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      function playTone(freq, startTime, duration) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        // Reduced volume (0.03) for a softer tone, faster attack (0.03s)
        gain.gain.linearRampToValueAtTime(0.03, startTime + 0.03); 
        
        const holdEnd = Math.max(startTime + 0.03, startTime + duration - 0.2);
        gain.gain.setValueAtTime(0.03, holdEnd);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      }

      const now = ctx.currentTime;
      // Faster arpeggio and shorter ringing duration (shorter sound overall)
      playTone(261.63, now, 0.3);        // C4
      playTone(329.63, now + 0.05, 0.3); // E4
      playTone(392.00, now + 0.10, 0.3); // G4
      playTone(493.88, now + 0.15, 0.4); // B4
    } catch(e) {}
  }

  function activateListeningMode() {
    manualVoice = true;
    if (micBtn) micBtn.style.color = 'var(--success-color)';
    showOverlay("Listening...", 'listening'); // Show animation instantly on mobile
    clearTimeout(manualVoiceTimeout);
    manualVoiceTimeout = setTimeout(() => {
      manualVoice = false;
      if (!isListening && micBtn) micBtn.style.color = 'var(--text-muted)';
      hideOverlay();
    }, 8000);
  }

  const siriOverlay = document.getElementById('siri-overlay');
  const siriText = document.getElementById('siri-text');

  function showOverlay(text, state = 'listening') {
    if (!siriOverlay) return;
    siriOverlay.className = `active ${state}`;
    if (text && siriText) siriText.textContent = text;
  }
  
  function hideOverlay() {
    if (siriOverlay) siriOverlay.className = '';
  }

  // Toggle Chat Panel
  if (botIcon) {
    botIcon.onclick = () => {
      chatPanel.style.display = chatPanel.style.display === 'flex' ? 'none' : 'flex';
      bubbleMsg.style.display = 'none';
      if (chatPanel.style.display === 'flex') scrollToBottom();
    };
  }
  if (closeChat) {
    closeChat.onclick = () => chatPanel.style.display = 'none';
  }

  // --- Voice Recognition Setup ---
  function initSpeechEngine() {
    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      try { recognition.abort(); } catch(e){}
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true; // Keep mic open to prevent beep loops
    recognition.interimResults = true; // Enable real-time transcript
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      botIcon.style.boxShadow = '0 0 20px rgba(52, 211, 153, 0.6)'; // Green glow when engine active
    };

    let silenceTimer = null;
    let lastProcessedIndex = 0;

    recognition.onresult = (event) => {
      if (isSpeaking) return; // Prevent AI from listening to its own voice
      
      let totalTranscript = "";
      for (let i = lastProcessedIndex; i < event.results.length; ++i) {
        totalTranscript += event.results[i][0].transcript;
      }
      totalTranscript = totalTranscript.toLowerCase();

      let lastWakeIndex = -1;
      let usedWakeWord = "";
      WAKE_WORDS.forEach(w => {
         let idx = totalTranscript.lastIndexOf(w);
         if (idx > lastWakeIndex) {
            lastWakeIndex = idx;
            usedWakeWord = w;
         }
      });

      if (lastWakeIndex !== -1 || manualVoice) {
         if (lastWakeIndex !== -1 && !wakeWordTriggered) {
             wakeWordTriggered = true;
             activateListeningMode();
             playBeep();
         }

         let command = "";
         if (lastWakeIndex !== -1) {
             command = totalTranscript.substring(lastWakeIndex + usedWakeWord.length).trim();
         } else {
             command = totalTranscript.trim();
         }

         showOverlay(command || "Listening...", 'listening');

         clearTimeout(silenceTimer);
         silenceTimer = setTimeout(() => {
            if (command.length > 0) {
               wakeWordTriggered = false;
               manualVoice = false;
               clearTimeout(manualVoiceTimeout);
               
               lastProcessedIndex = event.results.length;

               if (botIcon) botIcon.classList.add('ai-processing');
               showOverlay(command, 'processing');
               
               processCommand(command, true);
            } else {
               activateListeningMode(); 
            }
         }, 1500);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
      }
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        isListening = false;
        clearTimeout(restartTimeout); // Fatal error, do not restart
      }
    };

    recognition.onend = () => {
      isListening = false;
      botIcon.style.boxShadow = '';
      if (micBtn) micBtn.style.color = 'var(--text-muted)';
      
      // If the AI is currently talking, DO NOT restart the mic (avoids feedback loop)
      if (isSpeaking) return;

      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(() => {
        try { 
          recognition.start(); 
        } catch(e) {
          // If start fails due to invalid state, recreate engine
          initSpeechEngine();
          try { recognition.start(); } catch(e2){}
        }
      }, 500);
    };
  }

  if ('webkitSpeechRecognition' in window) {
    initSpeechEngine();

    // Manual start override via mic button
    if (micBtn) {
      micBtn.onclick = () => {
        activateListeningMode();
        showToast('Listening... speak your command!', 'success');
        if (!isListening) {
          try { 
            recognition.start(); 
          } catch(e){
            console.error(e);
          }
        }
      };
    }

    // Start engine (might fail if no user gesture)
    try { 
      recognition.start(); 
      if (micBtn) micBtn.style.color = 'var(--success-color)';
    } catch(e){}

    // Browser security blocks mic on load. We start it on the very first click/keypress anywhere on the site.
    const startOnInteraction = () => {
      // KEEP MIC HOT HACK: Holding a silent audio stream keeps the OS microphone active. 
      // This prevents Android from forcefully killing SpeechRecognition during silence,
      // and eliminates the system beep when SpeechRecognition restarts because the mic hardware is already warm.
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => { window.persistentMicStream = stream; })
          .catch(e => {});
      }

      if (!isListening) {
        try { 
          recognition.start(); 
          if (micBtn) micBtn.style.color = 'var(--success-color)';
        } catch(e){}
      }
      document.removeEventListener('click', startOnInteraction);
      document.removeEventListener('keydown', startOnInteraction);
    };
    
    document.addEventListener('click', startOnInteraction);
    document.addEventListener('keydown', startOnInteraction);
    
    // Watchdog Pacemaker to ensure it NEVER stays dead
    setInterval(() => {
      if ('webkitSpeechRecognition' in window && !isListening && !isSpeaking) {
        try { 
          recognition.start(); 
        } catch(e) {
          initSpeechEngine();
          try { recognition.start(); } catch(e2){}
        }
      }
    }, 5000);
  } else {
    console.warn('Speech recognition not supported in this browser.');
    if (micBtn) micBtn.style.display = 'none';
  }

  // --- Text Command Setup ---
  const handleTextSubmit = () => {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    processCommand(text, false);
  };

  if (sendBtn) sendBtn.onclick = handleTextSubmit;
  if (chatInput) chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleTextSubmit();
  });

  // --- Core Processing Logic ---
  async function processCommand(commandText, fromVoice) {
    appendChatMessage('user', commandText);
    
    const loadingId = 'loading-' + Date.now();
    appendChatMessage('assistant', '<i class="fa-solid fa-spinner fa-spin"></i> Processing...', loadingId);

    try {
      const res = await api.sendAiCommand(commandText);
      document.getElementById(loadingId)?.remove();
      if (botIcon) botIcon.classList.remove('ai-processing');

      if (res.success && res.data) {
        const { action, payload, message } = res.data;
        
        let aiMessage = message || (payload && payload.message);
        if (aiMessage) {
          appendChatMessage('assistant', aiMessage);
          showOverlay(aiMessage, 'speaking'); // show text on overlay while speaking
          speakContent(aiMessage);
        } else {
          hideOverlay(); // Hide overlay if nothing to speak
        }

        // Execute action
        executeAction(action, payload);
      } else {
        appendChatMessage('assistant', 'Sorry, I encountered an error.');
        hideOverlay();
      }
    } catch (e) {
      document.getElementById(loadingId)?.remove();
      if (botIcon) botIcon.classList.remove('ai-processing');
      appendChatMessage('assistant', 'Network error reaching the AI.');
      hideOverlay();
    }
    
    if (isListening && botIcon) botIcon.style.boxShadow = '0 0 20px rgba(52, 211, 153, 0.6)';
  }

  function executeAction(action, payload) {
    if (action === 'NAVIGATE' && payload.tab) {
      // Simulate click on nav item
      const navItem = document.querySelector(`.nav-item[data-target="${payload.tab}"]`);
      if (navItem) navItem.click();
    } else if (action === 'ADD_HABIT') {
      // If we are on habits tab, click refresh button (we need to trigger a reload)
      const navItem = document.querySelector('.nav-item[data-target="habits"]');
      if (navItem) navItem.click();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ai_refresh_habits'));
      }, 500);
      showToast('Habit Added!', 'success');
    } else if (action === 'ADD_TASK') {
      const navItem = document.querySelector('.nav-item[data-target="tasks"]');
      if (navItem) navItem.click();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ai_refresh_tasks'));
      }, 500);
      showToast('Task Added!', 'success');
    } else if (action === 'ADD_GOAL') {
      const navItem = document.querySelector('.nav-item[data-target="goals"]');
      if (navItem) navItem.click();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ai_refresh_goals'));
      }, 500);
      showToast('Goal Added!', 'success');
    } else if (action === 'ADD_EXPENSE') {
      const navItem = document.querySelector('.nav-item[data-target="expenses"]');
      if (navItem) navItem.click();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ai_refresh_expenses'));
        window.dispatchEvent(new CustomEvent('ai_refresh_dashboard')); // also refresh dashboard stats
      }, 500);
      showToast('Expense/Income Added!', 'success');
    } else if (action === 'START_POMODORO') {
      const navItem = document.querySelector('.nav-item[data-target="pomodoro"]');
      if (navItem) navItem.click();
      window.dispatchEvent(new CustomEvent('ai_start_pomodoro', { detail: { minutes: payload.minutes || null } }));
    } else if (action === 'PAUSE_POMODORO') {
      window.dispatchEvent(new CustomEvent('ai_pause_pomodoro'));
    } else if (action === 'RESET_POMODORO') {
      window.dispatchEvent(new CustomEvent('ai_reset_pomodoro'));
    } else if (action === 'EDIT_FITNESS') {
      const navItem = document.querySelector('.nav-item[data-target="fitness"]');
      if (navItem) navItem.click();
      
      const loadingId = 'loading-' + Date.now();
      appendChatMessage('assistant', '<i class="fa-solid fa-spinner fa-spin"></i> Consulting Sage...', loadingId);
      showOverlay('Consulting Sage...', 'speaking');
      
      api.editFitnessPlan(payload.prompt || "Change my plan").then(res => {
        document.getElementById(loadingId)?.remove();
        if (res.success && res.data && res.data.chatHistory) {
           const history = res.data.chatHistory;
           const lastMsg = history[history.length - 1].content;
           appendChatMessage('assistant', lastMsg);
           speakContent(lastMsg);
           showOverlay(lastMsg, 'speaking');
           window.dispatchEvent(new CustomEvent('ai_refresh_fitness')); 
        } else {
           appendChatMessage('assistant', 'Sorry, I had trouble updating your fitness plan.');
           hideOverlay();
        }
      }).catch(e => {
         document.getElementById(loadingId)?.remove();
         appendChatMessage('assistant', 'Network error reaching Sage.');
         hideOverlay();
      });
    }
  }

  function appendChatMessage(role, content, id = null) {
    if (!messagesDiv) return;
    const idAttr = id ? `id="${id}"` : '';
    messagesDiv.insertAdjacentHTML('beforeend', `<div ${idAttr} class="chat-msg ${role}">${content}</div>`);
    scrollToBottom();
  }

  function scrollToBottom() {
    if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function speakContent(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // cancel any ongoing speech
    
    // strip HTML tags
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    currentUtterance = new SpeechSynthesisUtterance(cleanText);
    currentUtterance.lang = 'en-US';
    
    currentUtterance.onstart = () => {
      isSpeaking = true;
      if (botIcon) botIcon.classList.add('ai-speaking');
      // Do not abort recognition on mobile as it cannot be restarted without a user gesture.
      // We ignore the AI's own voice via the isSpeaking flag in onresult.
    };
    currentUtterance.onend = () => {
      isSpeaking = false;
      if (botIcon) botIcon.classList.remove('ai-speaking');
      hideOverlay(); // Hide overlay when done speaking
      
      if (cleanText.trim().endsWith('?')) {
        activateListeningMode();
      }
      
      // Resume listening
      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(() => {
        if (!isListening) {
          try { recognition.start(); } catch(e){
            initSpeechEngine();
            try { recognition.start(); } catch(e2){}
          }
        }
      }, 500);
    };
    currentUtterance.onerror = () => {
      isSpeaking = false;
      if (botIcon) botIcon.classList.remove('ai-speaking');
      hideOverlay();
      
      // Resume listening
      clearTimeout(restartTimeout);
      restartTimeout = setTimeout(() => {
        if (!isListening) {
          try { recognition.start(); } catch(e){
            initSpeechEngine();
            try { recognition.start(); } catch(e2){}
          }
        }
      }, 500);
    };
    
    // Optional: wait for voices to load if they aren't yet
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const best = voices.find(v => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
      if (best) currentUtterance.voice = best;
    }
    
    window.speechSynthesis.speak(currentUtterance);
  }
}
