// Грибо.Net Browser - Лисичка.AI
// Использует только бесплатные облачные API

class LisichkaAI {
    constructor() {
        this.messages = [];
        this.voiceEnabled = true;
        this.speechRecognition = null;
        this.isListening = false;
        this.chatHistory = [];
        this.apiProvider = 'huggingface'; // Используем бесплатный API

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
            apiKey: localStorage.getItem('huggingfaceKey') || '', // Опциональный ключ
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
            this.addMessage(response, 'ai');
            this.chatHistory.push({ role: 'assistant', content: response });

            // Озвучиваем ответ если включено
            if (this.voiceEnabled) {
                this.speak(response);
            }
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('❌ Ошибка: ' + error.message, 'error');
        }
    }

    async getAIResponse(message) {
        // Используем бесплатный API Hugging Face
        // Можно также использовать: OpenAI API (платный), Groq API, etc.

        try {
            // API 1: Hugging Face (бесплатный)
            return await this.queryHuggingFace(message);
        } catch (error) {
            console.error('Hugging Face error:', error);
            // Fallback на простой ответ
            return this.getSimpleResponse(message);
        }
    }

    async queryHuggingFace(message) {
        const API_URL = "https://api-inference.huggingface.co/models/gpt2";
        
        const response = await fetch(API_URL, {
            headers: { Authorization: `Bearer hf_placeholder` }, // Без ключа работает ограниченно
            method: "POST",
            body: JSON.stringify({ inputs: message }),
        });

        if (!response.ok) {
            throw new Error('Hugging Face API error');
        }

        const result = await response.json();
        
        if (Array.isArray(result) && result[0] && result[0].generated_text) {
            return result[0].generated_text;
        }

        return this.getSimpleResponse(message);
    }

    getSimpleResponse(message) {
        // Когда API недоступна, используем встроенные ответы
        // В реальном приложении можно использовать другой свободный API
        const responses = {
            привет: 'Привет! 👋 Как дела? Чем я могу вам помочь?',
            'как дела': 'Спасибо за вопрос! 😊 У меня все хорошо. А у вас?',
            помощь: 'Я готова помочь! 🦊 Я могу общаться с вами голосом или текстом. Попробуйте спросить меня что-нибудь!',
            'что ты можешь': 'Я Лисичка.AI 🦊 Я могу:\n- Общаться с вами 💬\n- Отвечать голосом 🔊\n- Отвечать на вопросы 🧠\n- Помогать советами 💡',
            пока: 'До свидания! 👋 Было приятно с вами общаться!',
            спасибо: 'Пожалуйста! 😊 Рада помочь!',
        };

        const lowerMessage = message.toLowerCase();
        for (const [key, value] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return value;
            }
        }

        // Генерируем простой ответ
        return `Интересно! Вы сказали: "${message}". 🤔 Я понимаю, но мне нужен API для полноценного ответа. Пожалуйста, добавьте ключ Hugging Face в настройки!`;
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

        // Удаляем индикатор через 3 секунды (если ответ пришел)
        setTimeout(() => {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) indicator.remove();
        }, 3000);
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
        this.settings.apiKey = document.getElementById('ollamaUrl').value; // Используем для API ключа

        localStorage.setItem('voiceLanguage', this.settings.voiceLanguage);
        localStorage.setItem('voiceRate', this.settings.voiceRate);
        localStorage.setItem('huggingfaceKey', this.settings.apiKey);

        alert('✅ Настройки сохранены!');
        document.getElementById('settingsModal').style.display = 'none';
    }

    async checkApiStatus() {
        const statusEl = document.getElementById('ollamaStatus');
        const textEl = document.getElementById('ollamaText');

        // Проверяем доступность API
        try {
            const response = await fetch('https://api-inference.huggingface.co/models/gpt2', {
                method: 'POST',
                headers: { Authorization: 'Bearer hf_placeholder' },
                body: JSON.stringify({ inputs: 'test' }),
            });

            if (response.ok || response.status === 429) { // 429 = rate limited but API works
                statusEl.classList.remove('error');
                statusEl.classList.add('success');
                statusEl.textContent = '🟢';
                textEl.textContent = 'Hugging Face API готова';
            } else {
                throw new Error('API недоступен');
            }
        } catch (error) {
            statusEl.classList.add('error');
            statusEl.textContent = '🔴';
            textEl.textContent = 'API недоступна (используются встроенные ответы)';
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
