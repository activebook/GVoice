// src/renderer.js
/**
 * This direct import won't work and isn't secure with context isolation. 
 * Instead, all Electron functionality for the renderer should be:
 * Imported in the preload script
 * Exposed through contextBridge in a controlled way
 * Accessed in renderer.js through the window object (like window.api.methodName())
 */
//import { ipcRenderer } from 'electron'

const STATUS = {
    STATUS_TYPE_SUCESS: "success",
    STATUS_TYPE_ERROR: "error",
    STATUS_TYPE_INFO: "info",
    STATUS_TYPE_LOADING: "loading"
}

// src/renderer.js
document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const convertBtn = document.getElementById('convert-btn');
    const audioPlayer = document.getElementById('audio-player');
    const openFileBtn = document.getElementById('open-file-btn');
    const voiceListBtn = document.getElementById('voice-list-btn');
    const voiceSelect = document.getElementById('voice-select');

    // Settings modal elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModal = document.getElementById('close-settings-modal');
    const cancelSettings = document.getElementById('cancel-settings');
    const settingsForm = document.getElementById('settings-form');
    const apiKeyInput = document.getElementById('api-key');
    const speechStyleInput = document.getElementById('speech-style');
    const ttsEngineSelect = document.getElementById('tts-engine');

    // Voice list dropdown elements
    const voiceListDropdown = document.getElementById('voice-list-dropdown');
    const voiceListContainer = document.getElementById('voice-list-container');
    const voiceListLoading = document.getElementById('voice-list-loading');
    const voiceListEmpty = document.getElementById('voice-list-empty');
    const voiceListItems = document.getElementById('voice-list-items');

    // Status functionality
    function showStatus(type, message) {
        const statusContainer = document.getElementById('status-container');
        const statusInner = document.getElementById('status-inner');
        const statusIcon = document.getElementById('status-icon');
        const statusMessage = document.getElementById('status-message');

        // Set the appropriate classes based on status type
        statusContainer.className = 'w-full mb-6 overflow-hidden transition-all duration-300';

        // Clear any previous status classes
        statusInner.classList.remove('bg-green-50', 'bg-red-50', 'bg-blue-50', 'bg-purple-50');
        statusContainer.classList.remove('bg-green-50', 'bg-red-50', 'bg-blue-50', 'bg-purple-50');
        statusMessage.classList.remove('text-green-700', 'text-red-700', 'text-blue-700', 'text-purple-700');
        statusIcon.innerHTML = '';

        // Add specific styling based on status type
        type = type.trim().toLowerCase()
        if (type === STATUS.STATUS_TYPE_SUCESS) {
            // Background color
            statusInner.classList.add('bg-green-50');
            statusContainer.classList.add('bg-green-50');
            statusMessage.classList.add('text-green-700');
            statusIcon.innerHTML = `<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`;
        } else if (type === STATUS.STATUS_TYPE_ERROR) {
            // Background color
            statusInner.classList.add('bg-red-50');
            statusContainer.classList.add('bg-red-50');
            statusMessage.classList.add('text-red-700');
            statusIcon.innerHTML = `<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>`;
        } else if (type === STATUS.STATUS_TYPE_INFO) {
            // Background color
            statusInner.classList.add('bg-blue-50');
            statusContainer.classList.add('bg-blue-50');
            statusMessage.classList.add('text-blue-700');
            statusIcon.innerHTML = `<svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`;
        } else if (type === STATUS.STATUS_TYPE_LOADING) {
            // Background color
            statusInner.classList.add('bg-purple-50');
            statusContainer.classList.add('bg-purple-50');
            statusMessage.classList.add('text-purple-700');
            statusIcon.innerHTML = `<svg class="animate-spin h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>`;
        }

        // Set the message
        statusMessage.textContent = message;

        // Show the container
        statusContainer.style.maxHeight = '100px';

        // Set up close button
        document.getElementById('close-status').addEventListener('click', hideStatus);
    }

    function hideStatus() {
        const statusContainer = document.getElementById('status-container');
        statusContainer.style.maxHeight = '0';
    }

    // Example usage:
    // showStatus('loading', 'Converting your text...');
    // showStatus('success', 'Conversion completed successfully!');
    // showStatus('error', 'Failed to convert. Please try again.');
    // showStatus('info', 'Using enhanced voice model.');

    // Load available voices dynamically (optional)
    async function loadVoices() {
        try {
            window.api.getAvailableVoices();
        } catch (error) {
            showStatus(STATUS.STATUS_TYPE_ERROR, `Failed to load voices. Please try again. ${error}`);
        }
    }

    // Load voices and update the select element
    let gFilePrefix = '';
    loadVoices();
    window.api.onVoicesRetrieved((voices, filePrefix) => {
        gFilePrefix = filePrefix;
        // Clear existing options
        voiceSelect.innerHTML = '';

        // Add each voice as an option with name and description
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.id;
            option.textContent = `${voice.name} (${voice.description})`;
            voiceSelect.appendChild(option);
        });

        // Load default voice from settings and set it as selected
        loadDefaultVoice();

        showStatus(STATUS.STATUS_TYPE_INFO, 'Click "Convert to Speech" to begin conversion.');
    });

    // Listen for conversion progress updates
    const cleanup = window.api.onConversionProgress((progress) => {
        if (progress.status === window.api.STATUS.TTS_SERVICE_STATUS_DONE) {
            // Update audio player with the new file
            const audioPath = progress.message
            audioPlayer.src = audioPath
            audioPlayer.style.display = 'block'

            // Reset button
            convertBtn.disabled = false
            convertBtn.textContent = 'Convert to Speech'

            // Show success message
            showStatus(STATUS.STATUS_TYPE_SUCESS, 'Conversion completed successfully!');

            // Refresh voice list if dropdown is currently visible
            const isDropdownVisible = !voiceListDropdown.classList.contains('invisible');
            if (isDropdownVisible) {
                loadAudioFiles();
            }
        } else if (progress.status === window.api.STATUS.TTS_SERVICE_STATUS_START) {
            showStatus(STATUS.STATUS_TYPE_INFO, 'Starting conversion...');
    } else if (progress.status === window.api.STATUS.TTS_SERVICE_STATUS_ERROR) {
        showStatus(STATUS.STATUS_TYPE_ERROR, `Error: ${progress.message}`);

        // Reset button
        convertBtn.disabled = false
        convertBtn.textContent = 'Convert to Speech'
    }
    })

    /**
     * Convert text to speech click event
     */
    convertBtn.addEventListener('click', async () => {
        const text = textInput.value.trim()
        if (!text) {
            showStatus(STATUS.STATUS_TYPE_ERROR, 'Please enter some text to convert');
            return
        }

        const voice = voiceSelect.value;
        try {
            // Load current settings
            const settings = await window.api.loadSettings();

            // Check if required settings are configured
            if (!settings || !settings.apiKey || settings.apiKey.trim() === '' ||
                !settings.ttsEngine || settings.ttsEngine.trim() === '') {
                // Settings not configured, show settings modal
                showStatus(STATUS.STATUS_TYPE_INFO, 'Please configure your API key and TTS engine in settings first.');
                showSettingsModal();
                return;
            }

            // Show loading state
            convertBtn.disabled = true
            convertBtn.textContent = 'Converting...'
            showStatus(STATUS.STATUS_TYPE_LOADING, 'Converting your text...');

            // Use the exposed API method
            // No need await here, as the conversion is handled asynchronously(in subthread)
            window.api.convertTextToSpeech(text, voice, gFilePrefix, settings)

        } catch (error) {
            console.error('TTS conversion error:', error)

            // Show error message
            showStatus(STATUS.STATUS_TYPE_ERROR, `Error: ${error.message || 'Failed to convert text to speech'}`);

            // Reset button
            convertBtn.disabled = false
            convertBtn.textContent = 'Convert to Speech'
        }
    });

    /**
     * Open file location click event
     */
    openFileBtn.addEventListener('click', () => {
        // Always open the audio files folder
        window.api.openFileLocation();
    });

    // Function to update button state based on audio src
    function updateButtonState() {
        // Always keep the button enabled
        openFileBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        openFileBtn.removeAttribute('disabled');
    }
    // Update when audio source changes
    audioPlayer.addEventListener('loadedmetadata', updateButtonState);
    audioPlayer.addEventListener('error', updateButtonState);
    updateButtonState();

    /**
     * Voice List functionality
     */
    // Function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Function to format date
    function formatDate(date) {
        return new Date(date).toLocaleString();
    }

    // Function to load and display audio files
    async function loadAudioFiles() {
        try {
            // Show loading state
            voiceListLoading.classList.remove('hidden');
            voiceListEmpty.classList.add('hidden');
            voiceListItems.classList.add('hidden');
            voiceListItems.innerHTML = '';

            const audioFiles = await window.api.getAudioFilesList();

            // Hide loading
            voiceListLoading.classList.add('hidden');

            if (audioFiles.length === 0) {
                voiceListEmpty.classList.remove('hidden');
                return;
            }

            // Create file items
            audioFiles.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'voice-list-item';
                fileItem.innerHTML = `
                    <div class="file-container" style="text-align: center; width: 100%; padding: 8px 16px; box-sizing: border-box;">
                        <div class="file-name" title="${file.name}" style="text-align: center !important; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">
                            ${file.name}
                        </div>
                    </div>
                `;

                // Add click event to play the audio
                fileItem.addEventListener('click', () => {
                    audioPlayer.src = `file://${file.path}`;
                    audioPlayer.style.display = 'block';
                    toggleVoiceListDropdown(); // Close the dropdown
                    showStatus(STATUS.STATUS_TYPE_INFO, `Playing: ${file.name}`);
                });

                voiceListItems.appendChild(fileItem);
            });

            voiceListItems.classList.remove('hidden');
        } catch (error) {
            console.error('Error loading audio files:', error);
            voiceListLoading.classList.add('hidden');
            voiceListEmpty.classList.remove('hidden');
            showStatus(STATUS.STATUS_TYPE_ERROR, 'Failed to load audio files');
        }
    }

    // Function to toggle voice list dropdown
    function toggleVoiceListDropdown() {
        const isVisible = !voiceListDropdown.classList.contains('invisible');
        if (isVisible) {
            // Hide dropdown
            hideVoiceListDropdown();
        } else {
            // Show dropdown and load files
            showVoiceListDropdown();
        }
    }

    // Function to show voice list dropdown
    function showVoiceListDropdown() {
        // Position above the voice list button
        const buttonRect = voiceListBtn.getBoundingClientRect();
        const dropdownWidth = 400; // Smaller size
        const dropdownHeight = 300; // Smaller height

        // Position above the button, centered horizontally
        let left = buttonRect.left + (buttonRect.width / 2) - (dropdownWidth / 2);
        let top = buttonRect.top - dropdownHeight - 10; // 10px above button

        // Ensure dropdown doesn't go off-screen horizontally
        if (left < 10) left = 10;
        if (left + dropdownWidth > window.innerWidth - 10) {
            left = window.innerWidth - dropdownWidth - 10;
        }

        // If there's not enough space above, position below the button
        if (top < 10) {
            top = buttonRect.bottom + 10;
        }

        // Forcefully set all styles to override CSS
        voiceListDropdown.style.cssText = `
            left: ${left}px !important;
            top: ${top}px !important;
            width: ${dropdownWidth}px !important;
            height: ${dropdownHeight}px !important;
            max-height: ${dropdownHeight}px !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 99999 !important;
            position: fixed !important;
        `;

        voiceListDropdown.classList.remove('opacity-0', 'invisible', 'max-h-0');
        voiceListDropdown.classList.add('opacity-100');
        loadAudioFiles();
    }

    // Function to hide voice list dropdown
    function hideVoiceListDropdown() {
        // Remove visibility classes
        voiceListDropdown.classList.remove('opacity-100');
        voiceListDropdown.classList.add('opacity-0', 'invisible', 'max-h-0');

        // Only override visibility styles, keep position
        voiceListDropdown.style.opacity = '0';
        voiceListDropdown.style.visibility = 'hidden';
        voiceListDropdown.style.maxHeight = '0px';
        voiceListDropdown.style.zIndex = '-1';
    }

    // Function to close voice list dropdown
    function closeVoiceListDropdown() {
        hideVoiceListDropdown();
    }

    // Voice list button click handler
    voiceListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleVoiceListDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const isVisible = !voiceListDropdown.classList.contains('invisible');
        if (isVisible && !voiceListDropdown.contains(e.target) && e.target !== voiceListBtn) {
            closeVoiceListDropdown();
        }
    });

    // Prevent dropdown from closing when clicking inside it
    voiceListDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    /**
     * Below is the theme toggle functionality
     */
    const themeToggle = document.getElementById('theme-toggle');
    const toggleSlider = document.getElementById('toggle-slider');

    // Check for saved theme preference or use preferred color scheme
    const isDarkMode = localStorage.getItem('darkMode') === 'true' ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Set initial theme
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        toggleSlider.classList.remove('translate-x-1');
        toggleSlider.classList.add('translate-x-6');
        themeToggle.classList.remove('bg-gray-200');
        themeToggle.classList.add('bg-gray-600');
    }

    // Theme toggle click handler
    themeToggle.addEventListener('click', () => {
        // Toggle dark class on root html element
        document.documentElement.classList.toggle('dark');
        // Toggle system dark mode
        window.darkMode.toggle();

        // Move the slider
        if (document.documentElement.classList.contains('dark')) {
            toggleSlider.classList.remove('translate-x-1');
            toggleSlider.classList.add('translate-x-6');
            themeToggle.classList.remove('bg-gray-200');
            themeToggle.classList.add('bg-gray-600');
            localStorage.setItem('darkMode', 'true');
        } else {
            toggleSlider.classList.remove('translate-x-6');
            toggleSlider.classList.add('translate-x-1');
            themeToggle.classList.remove('bg-gray-600');
            themeToggle.classList.add('bg-gray-200');
            localStorage.setItem('darkMode', 'false');
        }
    });

    /**
     * Settings modal functionality
     */
    // Function to show settings modal
    function showSettingsModal() {
        settingsModal.classList.remove('hidden');
        loadSettings();
    }

    // Function to hide settings modal
    function hideSettingsModal() {
        settingsModal.classList.add('hidden');
    }

    // Function to load settings from file
    async function loadSettings() {
        try {
            const settings = await window.api.loadSettings();
            if (settings) {
                apiKeyInput.value = settings.apiKey || '';
                speechStyleInput.value = settings.speechStyle || '';
                ttsEngineSelect.value = settings.ttsEngine || 'gemini-2.5-flash-preview-tts';
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            showStatus(STATUS.STATUS_TYPE_ERROR, 'Failed to load settings');
        }
    }

    // Function to save settings to file
    async function saveSettings(settings) {
        try {
            await window.api.saveSettings(settings);
            showStatus(STATUS.STATUS_TYPE_SUCESS, 'Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            showStatus(STATUS.STATUS_TYPE_ERROR, 'Failed to save settings');
        }
    }

    // Settings button click handler
    settingsBtn.addEventListener('click', () => {
        showSettingsModal();
    });

    // Close modal handlers
    closeSettingsModal.addEventListener('click', () => {
        hideSettingsModal();
    });

    cancelSettings.addEventListener('click', () => {
        hideSettingsModal();
    });

    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            hideSettingsModal();
        }
    });

    // Settings form submit handler
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const settings = {
            apiKey: apiKeyInput.value.trim(),
            speechStyle: speechStyleInput.value.trim(),
            ttsEngine: ttsEngineSelect.value
        };

        await saveSettings(settings);
        hideSettingsModal();
    });

    // Load settings on app start
    loadSettings();

    /**
     * Default voice functionality
     */
    // Function to load default voice from settings
    async function loadDefaultVoice() {
        try {
            const settings = await window.api.loadSettings();
            if (settings && settings.defaultVoice) {
                // Find the option with the matching voice name
                const options = Array.from(voiceSelect.options);
                const defaultOption = options.find(option => {
                    // Extract voice name from the option text (format: "Name (Description)")
                    const voiceName = option.textContent.split(' (')[0];
                    return voiceName === settings.defaultVoice;
                });

                if (defaultOption) {
                    voiceSelect.value = defaultOption.value;
                }
            }
        } catch (error) {
            console.error('Error loading default voice:', error);
        }
    }

    // Function to save selected voice as default
    async function saveDefaultVoice(voiceName) {
        try {
            const currentSettings = await window.api.loadSettings() || {};
            const updatedSettings = {
                ...currentSettings,
                defaultVoice: voiceName
            };
            await window.api.saveSettings(updatedSettings);
        } catch (error) {
            console.error('Error saving default voice:', error);
        }
    }

    // Listen for voice selection changes and save as default
    voiceSelect.addEventListener('change', () => {
        // Extract voice name from selected option text (format: "Name (Description)")
        const selectedOption = voiceSelect.options[voiceSelect.selectedIndex];
        const voiceName = selectedOption.textContent.split(' (')[0];
        saveDefaultVoice(voiceName);
    });
});
