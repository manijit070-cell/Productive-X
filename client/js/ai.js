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

  let isListening = false;
  let manualVoice = false;
  let isSpeaking = false;
  let wakeWordTriggered = false;
  let recognition = null;
  let manualVoiceTimeout = null;
  let currentUtterance = null; // Fix Chrome GC bug for speech synthesis
  let finalCommand = "";
  let silenceTimeout = null;
  const WAKE_WORDS = ['coach', 'couch', 'catch', 'poach', 'cotch', 'gooch'];

  function activateListeningMode() {
    manualVoice = true;
    if (micBtn) micBtn.style.color = 'var(--success-color)';
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
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Enable real-time transcript
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      botIcon.style.boxShadow = '0 0 20px rgba(52, 211, 153, 0.6)'; // Green glow when engine active
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        let transcript = event.results[i][0].transcript.trim().toLowerCase();
        let foundWakeWord = WAKE_WORDS.find(w => transcript.includes(w));
        
        if (foundWakeWord) {
          wakeWordTriggered = true;
          activateListeningMode();
        }

        // Wake word or manual check
        if (manualVoice || wakeWordTriggered) {
          let command = transcript;
          
          if (foundWakeWord) {
            const wakeIndex = transcript.indexOf(foundWakeWord);
            command = transcript.substring(wakeIndex + foundWakeWord.length).trim();
          } else if (wakeWordTriggered && !foundWakeWord) {
            // The wake word was here earlier but got mutated out by interim results.
            // Just strip the first word assuming it was the mutated wake word.
            command = command.split(' ').slice(1).join(' ').trim();
          }
          
          clearTimeout(silenceTimeout);
          
          if (event.results[i].isFinal) {
            wakeWordTriggered = false; // Reset for next sentence
            
            if (command.length > 0) {
              finalCommand += (finalCommand ? " " : "") + command;
            }
            
            if (finalCommand.length > 0) {
              showOverlay(finalCommand, 'listening');
              silenceTimeout = setTimeout(() => {
                botIcon.classList.add('ai-processing'); // CSS animation
                showOverlay(finalCommand, 'processing');
                manualVoice = false;
                clearTimeout(manualVoiceTimeout);
                let cmdToProcess = finalCommand;
                finalCommand = "";
                processCommand(cmdToProcess, true);
              }, 3000);
            } else if (foundWakeWord || manualVoice) {
              hideOverlay();
              const reply = 'Yes? I am listening.';
              appendChatMessage('assistant', reply);
              speakContent(reply);
              // manualVoice stays true because activateListeningMode() keeps it active
            }
          } else {
            // Interim: Just show what they are saying in real time
            let displayCmd = (finalCommand ? finalCommand + " " : "") + command;
            showOverlay(displayCmd || "Listening...", 'listening');
          }
        }
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
      // Assuming expenses might be part of dashboard or a separate tab
      const navItem = document.querySelector('.nav-item[data-target="dashboard"]'); // Fallback
      if (navItem) navItem.click();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ai_refresh_dashboard'));
      }, 500);
      showToast('Expense/Income Added!', 'success');
    } else if (action === 'EDIT_FITNESS') {
      const navItem = document.querySelector('.nav-item[data-target="fitness"]');
      if (navItem) navItem.click();
      
      const loadingId = 'loading-' + Date.now();
      appendChatMessage('assistant', '<i class="fa-solid fa-spinner fa-spin"></i> Consulting Fitness Coach...', loadingId);
      showOverlay('Consulting Fitness Coach...', 'speaking');
      
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
         appendChatMessage('assistant', 'Network error reaching the fitness coach.');
         hideOverlay();
      });
    } else if (action === 'START_POMODORO') {
      const navItem = document.querySelector('.nav-item[data-target="pomodoro"]');
      if (navItem) navItem.click();
      
      // Attempt to set timer and start (requires pomodoro script to be global or event-based)
      // For now, we dispatch an event
      window.dispatchEvent(new CustomEvent('ai_start_pomodoro', { detail: { minutes: payload.minutes || 25 } }));
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
      if (recognition) {
        try { recognition.abort(); } catch(e){}
      }
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
