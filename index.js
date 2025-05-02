document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const wordDisplay = document.getElementById('word-display');
    const hangmanImage = document.getElementById('hangman-image');
    const messageEl = document.getElementById('message');
    const usedLettersEl = document.getElementById('used-letters');
    const guessInput = document.getElementById('guess-input');
    const guessButton = document.getElementById('guess-button');
    const hintButton = document.getElementById('hint-button');
    const hintEl = document.getElementById('hint');
    const restartButton = document.getElementById('restart-button');
    const difficultySelect = document.getElementById('difficulty');

    // Game State
    let selectedWord = '';
    let guessedLetters = [];
    let wrongGuesses = 0;
    let maxWrongGuesses = 6;
    let wordData = null;

    // Fallback words if API fails
    const fallbackWords = [
        { word: "HANGMAN", definition: "A game for two in which one player tries to guess the letters of a word, and failed attempts are recorded by drawing a gallows and someone hanging on it.", origin: "From hang + man" },
        { word: "DEVELOPER", definition: "A person who develops something, especially computer software.", origin: "From develop + -er" },
        { word: "JAVASCRIPT", definition: "An object-oriented computer programming language commonly used to create interactive effects within web browsers.", origin: "Originally named Mocha, then LiveScript, finally JavaScript" },
        { word: "API", definition: "Application Programming Interface - a set of protocols for building software applications.", origin: "Acronym from Application Programming Interface" },
        { word: "DICTIONARY", definition: "A book or electronic resource that lists the words of a language and gives their meaning.", origin: "From Medieval Latin dictionarium" }
    ];

    // Initialize game
    async function initGame() {
        // Reset game state
        guessedLetters = [];
        wrongGuesses = 0;
        wordData = null;
        messageEl.textContent = 'Fetching word...';
        hintEl.textContent = '';
        guessInput.value = '';
        guessButton.disabled = true;
        hintButton.disabled = true;

        // Set difficulty
        maxWrongGuesses = 8 - parseInt(difficultySelect.value);

        // Reset hangman image
        updateHangmanDrawing();

        try {
            // Step 1: Fetch random word from Random Word API
            const wordResponse = await fetch('https://random-word-api.herokuapp.com/word');
            const [randomWord] = await wordResponse.json();

            if (!randomWord || typeof randomWord !== 'string') {
                throw new Error('Invalid word from Random Word API');
            }

            // Step 2: Get word details from Dictionary API
            const dictResponse = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${randomWord}`);
            const dictData = await dictResponse.json();

            if (!Array.isArray(dictData) || !dictData[0]?.word) {
                throw new Error('Dictionary API returned no definition');
            }

            wordData = dictData[0];
            selectedWord = wordData.word.toUpperCase();

            // Validate word (only letters and hyphens)
            if (!/^[A-Z-]+$/i.test(selectedWord)) {
                throw new Error('Word contains invalid characters');
            }

            // Display initial word with underscores
            updateWordDisplay();
            updateUsedLetters();

            messageEl.textContent = 'Word ready! Start guessing!';
            guessButton.disabled = false;
            hintButton.disabled = false;

        } catch (error) {
            console.error('Error initializing game:', error);
            messageEl.textContent = 'Error fetching word. Using fallback word.';

            const fallback = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
            selectedWord = fallback.word.toUpperCase();
            wordData = {
                meanings: [{
                    definitions: [{ definition: fallback.definition }]
                }],
                origin: fallback.origin
            };

            updateWordDisplay();
            updateUsedLetters();
            guessButton.disabled = false;
            hintButton.disabled = false;
        }
    }

    // Update the word display with guessed letters
    function updateWordDisplay() {
        wordDisplay.textContent = selectedWord
            .split('')
            .map(letter => {
                if (letter === '-') return '-';
                return guessedLetters.includes(letter) ? letter : '_';
            })
            .join(' ');
    }

    // Update the hangman drawing
    function updateHangmanDrawing() {
        hangmanImage.src = `resources/hangman-${Math.min(wrongGuesses, 7)}.png`;
        hangmanImage.alt = `Hangman stage ${wrongGuesses}`;
    }

    // Update the display of used letters
    function updateUsedLetters() {
        usedLettersEl.textContent = `Used letters: ${guessedLetters.join(', ')}`;
    }

    // Check if the guessed letter is in the word
    function checkLetter(letter) {
        if (guessedLetters.includes(letter)) {
            return 'already guessed';
        }

        guessedLetters.push(letter);

        if (selectedWord.includes(letter)) {
            return 'correct';
        } else {
            wrongGuesses++;
            return 'wrong';
        }
    }

    // Check if the game is won
    function isGameWon() {
        return selectedWord
            .split('')
            .every(letter => letter === '-' || guessedLetters.includes(letter));
    }

    // Check if the game is lost
    function isGameLost() {
        return wrongGuesses >= maxWrongGuesses;
    }

    // End the game
    function endGame(win) {
        if (win) {
            messageEl.textContent = 'Congratulations! You won!';
            messageEl.style.color = '#2ecc71';
        } else {
            messageEl.textContent = `Game over! The word was: ${selectedWord}`;
            messageEl.style.color = '#e74c3c';
        }

        guessButton.disabled = true;
        hintButton.disabled = true;

        // Show word information
        if (wordData) {
            let wordInfo = '';

            if (wordData.meanings?.[0]?.definitions?.[0]?.definition) {
                wordInfo += `Definition: ${wordData.meanings[0].definitions[0].definition}\n`;
            }

            if (wordData.origin) {
                wordInfo += `Origin: ${wordData.origin}`;
            }

            if (wordInfo) {
                setTimeout(() => {
                    hintEl.innerHTML = wordInfo.replace(/\n/g, '<br>');
                }, 1000);
            }
        }
    }

    // Provide a hint
    function giveHint() {
        if (!wordData) {
            hintEl.textContent = 'No word information available';
            return;
        }

        let hintText = '';

        if (wordData.meanings?.[0]?.definitions?.[0]?.definition) {
            hintText = `Definition: ${wordData.meanings[0].definitions[0].definition}`;
        }

        if (!hintText && wordData.origin) {
            hintText = `Origin: ${wordData.origin}`;
        }

        if (!hintText) {
            hintText = 'No hint available for this word';
        }

        hintEl.textContent = hintText;
        hintButton.disabled = true;
    }

    // Event listeners
    guessButton.addEventListener('click', () => {
        const letter = guessInput.value.toUpperCase();

        if (!letter.match(/^[A-Z]$/)) {
            messageEl.textContent = 'Please enter a single letter (A-Z)';
            return;
        }

        const result = checkLetter(letter);

        switch (result) {
            case 'already guessed':
                messageEl.textContent = `You already guessed "${letter}"`;
                break;
            case 'correct':
                messageEl.textContent = `Correct! "${letter}" is in the word.`;
                messageEl.style.color = '#2ecc71';
                updateWordDisplay();

                if (isGameWon()) {
                    endGame(true);
                }
                break;
            case 'wrong':
                messageEl.textContent = `Sorry, "${letter}" is not in the word.`;
                messageEl.style.color = '#e74c3c';
                updateHangmanDrawing();
                updateUsedLetters();

                if (isGameLost()) {
                    endGame(false);
                }
                break;
        }

        guessInput.value = '';
        guessInput.focus();
    });

    hintButton.addEventListener('click', giveHint);
    restartButton.addEventListener('click', initGame);

    guessInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            guessButton.click();
        }
    });

    difficultySelect.addEventListener('change', initGame);

    // Start the game
    initGame();
});