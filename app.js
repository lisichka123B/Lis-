// Грибо.Net Browser - Лисичка.AI
// Использует бесплатные облачные API

class LisichkaAI {
    constructor() {
        this.messages = [];
        this.voiceEnabled = true;
        this.speechRecognition = null;
        this.isListening = false;
        this.chatHistory = [];
        
        this.initSettings();
        this.setupEventListeners();
        this.initSpeechRecognition();
        this.displayWelcomeMessage();
        this.checkApiStatus();
    }

    initSettings() {
        this.settings = {
            voiceLanguage: localStorage.getItem('voiceLanguage') || 'ru-RU',
            voiceRate: parseFloat(localStorage.getItem('voiceRate')) || 1,
            apiChoice: localStorage.getItem('apiChoice') || 'groq', // groq, openrouter, google
        };
    }

    setupEventListeners() {
        // Отправка сообщения
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('textInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Голосовой ввод
        document.getElementById('voiceInputBtn').addEventListener('click', () => this.toggleVoiceInput());

        // Голосовой вывод
        document.getElementById('voiceToggleBtn').addEventListener('click', () => this.toggleVoiceOutput());

        // Навигация
        document.querySelectorAll('[data-chat]').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Модальные окна
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('data-close');
                document.getElementById(modalId).style.display = 'none';
            });
        });

        // Сохранение настроек
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());

        // Слайдер скорости речи
        const rateSlider = document.getElementById('voiceRate');
        rateSlider.addEventListener('input', (e) => {
            document.getElementById('rateValue').textContent = e.target.value + 'x';
        });
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Web Speech API not supported');
            return;
        }

        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = false;
        this.speechRecognition.interimResults = true;

        this.speechRecognition.onstart = () => {
            this.isListening = true;
            document.getElementById('voiceInputBtn').classList.add('listening');
            document.getElementById('voiceStatus').textContent = '🎙️ Слушаю...';
        };

        this.speechRecognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            if (event.results[event.results.length - 1].isFinal) {
                document.getElementById('textInput').value = transcript;
                this.sendMessage();
            }
        };

        this.speechRecognition.onend = () => {
            this.isListening = false;
            document.getElementById('voiceInputBtn').classList.remove('listening');
            document.getElementById('voiceStatus').textContent = '';
        };

        this.speechRecognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            document.getElementById('voiceStatus').textContent = `❌ Ошибка: ${event.error}`;
        };
    }

    toggleVoiceInput() {
        if (!this.speechRecognition) {
            alert('Голосовой ввод не поддерживается вашим браузером');
            return;
        }

        if (this.isListening) {
            this.speechRecognition.stop();
        } else {
            this.speechRecognition.start();
        }
    }

    toggleVoiceOutput() {
        this.voiceEnabled = !this.voiceEnabled;
        const btn = document.getElementById('voiceToggleBtn');
        btn.textContent = this.voiceEnabled ? '🔊 Голос: ВКЛ' : '🔇 Голос: ВЫКЛ';
        localStorage.setItem('voiceEnabled', this.voiceEnabled);
    }

    async sendMessage() {
        const input = document.getElementById('textInput');
        const message = input.value.trim();

        if (!message) return;

        // Добавляем сообщение пользователя
        this.addMessage(message, 'user');
        input.value = '';
        this.chatHistory.push({ role: 'user', content: message });

        // Показываем индикатор печати
        this.showTypingIndicator();

        try {
            // Получаем ответ от AI
            const response = await this.getAIResponse(message);
            this.removeTypingIndicator();
            this.addMessage(response, 'ai');
            this.chatHistory.push({ role: 'assistant', content: response });

            // Озвучиваем ответ если включено
            if (this.voiceEnabled) {
                this.speak(response);
            }
        } catch (error) {
            console.error('Error:', error);
            this.removeTypingIndicator();
            this.addMessage('❌ Ошибка: ' + error.message, 'error');
        }
    }

    async getAIResponse(message) {
        // Попробуем разные бесплатные API
        try {
            // API 1: Groq (самый быстрый!)
            return await this.queryGroqAPI(message);
        } catch (error1) {
            console.error('Groq API error:', error1);
            try {
                // API 2: OpenRouter
                return await this.queryOpenRouterAPI(message);
            } catch (error2) {
                console.error('OpenRouter API error:', error2);
                try {
                    // API 3: Google Generative AI
                    return await this.queryGoogleAPI(message);
                } catch (error3) {
                    console.error('Google API error:', error3);
                    // Fallback на встроенные ответы
                    return this.getSimpleResponse(message);
                }
            }
        }
    }

    // API 1: Groq API (Очень быстрый!)
    async queryGroqAPI(message) {
        const response = await fetch('https://api.groq.com/inference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mixtral-8x7b-32768',
                messages: [
                    { role: 'system', content: 'Ты Лисичка - дружелюбная и полезная нейросеть. Отвечай кратко и приветливо на русском.' },
                    ...this.chatHistory.slice(-5), // Последние 5 сообщений для контекста
                    { role: 'user', content: message }
                ],
                max_tokens: 500,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error('Groq API error: ' + response.status);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // API 2: OpenRouter (Альтернатива)
    async queryOpenRouterAPI(message) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer free', // Бесплатный режим
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct',
                messages: [
                    { role: 'system', content: 'Ты Лисичка - дружелюбная помощница. Отвечай кратко и приветливо.' },
                    ...this.chatHistory.slice(-5),
                    { role: 'user', content: message }
                ],
                max_tokens: 500,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            throw new Error('OpenRouter API error: ' + response.status);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // API 3: Google Generative AI
    async queryGoogleAPI(message) {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: 'Ты Лисичка - дружелюбная помощница. Отвечай кратко и приветливо на русском.' },
                            ...this.chatHistory.slice(-5).map(msg => ({ text: `${msg.role}: ${msg.content}` })),
                            { text: `user: ${message}` }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.7,
                }
            }),
        });

        if (!response.ok) {
            throw new Error('Google API error: ' + response.status);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    getSimpleResponse(message) {
        // Встроенные ответы когда API недоступны
        const lowerMessage = message.toLowerCase();
        
        const responses = {
            привет: 'Привет! 👋 Рада видеть тебя! Чем я могу помочь?',
            'как дела': 'Спасибо за вопрос! 😊 У меня всё отлично! А у тебя как?',
            помощь: 'Я готова помочь! 🦊 Я Лисичка и могу:\n- Общаться голосом и текстом\n- Отвечать на вопросы\n- Помогать советами',
            'что ты можешь': 'Я могу:\n- Общаться с вами 💬\n- Отвечать голосом 🔊\n- Помогать информацией 🧠\n- Слушать и понимать 👂',
            пока: 'До свидания! 👋 Было приятно с вами общаться!',
            спасибо: 'Пожалуйста! 😊 Рада помочь!',
            'кто ты': 'Я Лисичка.AI 🦊 - дружелюбная нейросеть в браузере Грибо.Net!',
            привет: 'Привет! Как дела? 🦊',
        };

        for (const [key, value] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return value;
            }
        }

        return `Интересно! Вы сказали: "${message}". 🤔 К сожалению, я не могу подключиться к API, но я готова выслушать вас и помочь встроенными ответами.`;
    }

    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.settings.voiceLanguage;
        utterance.rate = this.settings.voiceRate;

        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    }

    addMessage(text, sender) {
        const container = document.getElementById('messagesContainer');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}-message`;

        const avatar = sender === 'user' ? '👤' : (sender === 'error' ? '❌' : '🦊');
        const senderName = sender === 'user' ? 'Вы' : (sender === 'error' ? 'Ошибка' : 'Лисичка.AI');

        messageEl.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-body">
                <div class="message-sender">${senderName}</div>
                <div class="message-content">${this.escapeHtml(text)}</div>
            </div>
        `;

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    showTypingIndicator() {
        const container = document.getElementById('messagesContainer');
        const typingEl = document.createElement('div');
        typingEl.id = 'typingIndicator';
        typingEl.className = 'message ai-message typing';
        typingEl.innerHTML = `
            <div class="message-avatar">🦊</div>
            <div class="message-body">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        container.appendChild(typingEl);
        container.scrollTop = container.scrollHeight;
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    displayWelcomeMessage() {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = `
            <div class="message system-message">
                <div class="message-content">
                    👋 Привет! Я <strong>Лисичка.AI</strong> 🦊
                    <br><br>
                    Я готова общаться с вами:
                    <br>💬 <strong>Текстом</strong> - просто пишите
                    <br>🎤 <strong>Голосом</strong> - нажмите кнопку микрофона
                    <br>🔊 <strong>Я буду отвечать голосом</strong> - если включить
                    <br><br>
                    Начните с простого "Привет!" 😊
                </div>
            </div>
        `;
    }

    handleNavigation(e) {
        const action = e.target.closest('[data-chat]').getAttribute('data-chat');

        if (action === 'new-chat') {
            this.chatHistory = [];
            document.getElementById('messagesContainer').innerHTML = '';
            this.displayWelcomeMessage();
        } else if (action === 'settings') {
            document.getElementById('settingsModal').style.display = 'block';
        } else if (action === 'about') {
            document.getElementById('aboutModal').style.display = 'block';
        }
    }

    saveSettings() {
        this.settings.voiceLanguage = document.getElementById('voiceLanguage').value;
        this.settings.voiceRate = parseFloat(document.getElementById('voiceRate').value);
        this.settings.apiChoice = document.getElementById('apiChoice')?.value || 'groq';

        localStorage.setItem('voiceLanguage', this.settings.voiceLanguage);
        localStorage.setItem('voiceRate', this.settings.voiceRate);
        localStorage.setItem('apiChoice', this.settings.apiChoice);

        alert('✅ Настройки сохранены!');
        document.getElementById('settingsModal').style.display = 'none';
    }

    async checkApiStatus() {
        const statusEl = document.getElementById('ollamaStatus');
        const textEl = document.getElementById('ollamaText');

        // Проверяем доступность API
        try {
            const response = await fetch('https://api.groq.com/health', {
                method: 'GET',
                timeout: 5000,
            });

            if (response.ok || response.status === 429) {
                statusEl.classList.remove('error');
                statusEl.classList.add('success');
                statusEl.textContent = '🟢';
                textEl.textContent = 'API Готова к работе! ✅';
            } else {
                throw new Error('API недоступна');
            }
        } catch (error) {
            statusEl.classList.add('error');
            statusEl.textContent = '🟡';
            textEl.textContent = 'Проверка API... (встроенные ответы активны)';
            
            // Продолжаем попытку подключиться
            setTimeout(() => {
                this.checkApiStatus();
            }, 5000);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.lisichka = new LisichkaAI();
});
