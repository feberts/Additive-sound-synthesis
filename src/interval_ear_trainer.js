/*
 * COMPONENT: interval-button-component
 *
 * DESCRIPTION: Button for entering an interval.
 *              The input is passed on to the VUE instance.
 */
Vue.component('interval-button-component',
{
    template: '\
        <li>\
            <button class="interval_button" v-on:click="buttonIntervalClicked">\
                {{name}}\
            </button>\
        </li>\
    ',

    props: ['name', 'half_steps'],

    methods:
    {
        /*
         * FUNCTION: buttonIntervalClicked
         *
         * DESCRIPTION: Passing on the entered interval to the VUE instance.
         */
        buttonIntervalClicked: function()
        {
            console.log('button clicked : ' + this.name)
            this.$parent.evaluateAnswer(this.half_steps)
        }
    }
})

var intervalTrainerApp // central VUE instance

window.onload = function()
{
    console.log('loading window')

    /*
     * VUE-INSTANCE: IntervalTrainerVue
     *
     * DESCRIPTION: Central VUE instance.
     *              Implementation of the application logic.
     */
    intervalTrainerApp = new Vue(
    {
        el: '#IntervalTrainerVue',

        data:
        {
            /*
             * Array of intervals to be queried. Mapping of the half steps to
             * the interval names. The indices of the array correlate with the
             * `halfSteps` attribute. This is used as a key when binding with
             * the `interval-button-component` component.
             */
            intervals:
            [
                { halfSteps:  0, name: 'Unison' },
                { halfSteps:  1, name: 'Minor Second' },
                { halfSteps:  2, name: 'Second' },
                { halfSteps:  3, name: 'Minor Third' },
                { halfSteps:  4, name: 'Third' },
                { halfSteps:  5, name: 'Fourth' },
                { halfSteps:  6, name: 'Tritone' },
                { halfSteps:  7, name: 'Fifth' },
                { halfSteps:  8, name: 'Minor Sixth' },
                { halfSteps:  9, name: 'Sixth' },
                { halfSteps: 10, name: 'Minor Seventh' },
                { halfSteps: 11, name: 'Seventh' },
                { halfSteps: 12, name: 'Octave' }
            ],

            currentRootNote: -1, // current root note
            currentInterval: -1, // interval (in half steps)

            randomIntervals: [], // pseudo random intervals

            firstTry: true,
            feedbackColor: 'white', // default colour of play-again button

            scoreText: '',
            scoreTotal: 0,
            scoreCorrect: 0,

            bufferSource: null // buffer for audio output
        },

        /*
         * FUNCTION: created
         *
         * DESCRIPTION: Called automatically after initialization of the VUE
         *              instance. Causes the creation and playback of the first
         *              interval.
         */
        created: function()
        {
            console.log('created IntervalTrainerVue')
            // window.alert("Start"); // for Chrome autoplay policy

            this.newInterval()
            this.playCurrentInterval()
        },

        methods:
        {
            /*
             * FUNCTION: newInterval
             *
             * DESCRIPTION: Randomly generates a new root note and picks a
             *              pseudo random interval from a list.
             */
            newInterval: function()
            {
                if(this.randomIntervals.length == 0)
                {
                    for(let i = 0; i < 3; i++) // generate n sets of intervals
                    {
                        for(let interval = 0; interval <= 12; interval++) // [0..12] = [unison..octave]
                        {
                            this.randomIntervals.push(interval)
                        }
                    }
                }

                // pick a pseudo random interval from the list of remaining intervals:
                let randomIndex = Math.floor(Math.random() * this.randomIntervals.length);
                this.currentInterval = this.randomIntervals[randomIndex]
                this.randomIntervals.splice(randomIndex, 1);

                // generate a random root note:
                this.currentRootNote = Math.floor(Math.random() * 25) - 24 // [-24..0] = 2 octaves

                // update score:
                this.scoreText = 'Score: ' + this.scoreCorrect + '/' + this.scoreTotal
                this.scoreTotal++

                console.log('new interval : ' + this.intervals[this.currentInterval].name)
                console.log('intervals left (without current): ' + this.randomIntervals.length)
                console.log('interval array (without current): ' + this.randomIntervals.toString())
            },

            /*
             * FUNCTION: evaluateAnswer
             *
             * DESCRIPTION: Verification of the given answer. If successful, a
             *              new interval is generated and played. Otherwise the
             *              current interval is played again.
             *
             * PARAMETER:
             *
             *   halfSteps: Interval entered by the user in half steps.
             */
            evaluateAnswer: function(halfSteps)
            {
                console.log('answer received : ' + this.intervals[halfSteps].name)

                if(halfSteps == this.currentInterval) // answer is correct
                {
                    console.log('answer is correct')

                    if(this.firstTry) { this.scoreCorrect++ }
                    this.feedbackColor = 'white'
                    this.firstTry = true

                    this.newInterval()
                }
                else // wrong answer
                {
                    console.log('answer is wrong')

                    this.feedbackColor = 'salmon'
                    this.firstTry = false
                }

                this.playCurrentInterval()
            },

            /*
             * FUNCTION: playCurrentInterval
             *
             * DESCRIPTION: Audio output of the current interval using
             *              the Mozilla Web Audio API.
             */
            playCurrentInterval: function()
            {
                console.log('playing interval : ' + this.intervals[this.currentInterval].name)

                // ========== local functions ==========

                /*
                 * FUNCTION: noteToFrequency
                 *
                 * DESCRIPTION: Calculation of the frequency of a tone. The reference
                 *              tone is the concert pitch a = 440 Hz. The frequencies
                 *              are calculated on the basis of equal temperament.
                 *
                 * PARAMETER:
                 *
                 *   note: Deviation from the reference tone in semitone steps.
                 *         Example: 0 = a, 2 = b, -1 = g#
                 *
                 * RETURNS: The frequency in Hz
                 */
                function noteToFrequency(note)
                {
                    return 440 * Math.pow(2, note / 12)
                }

                /*
                 * FUNCTION: waveFunction
                 *
                 * DESCRIPTION: Generate a piano sound by additively combining
                 *              different waveforms.
                 *
                 * PARAMETER:
                 *
                 *   sampleNumber: Position of the sample on the horizontal
                 *                 axis (comparable to time)
                 *   frequency:    The fundamental frequency of the tone to be
                 *                 played in Hz
                 *
                 * RETURNS: Value of the calculated sample at position `sampleNumber`
                 */
                function waveFunction(sampleNumber, frequency)
                {
                    // Make sure the frequency correlates with the actual sampling rate:
                    const f = frequency / audioContext.sampleRate

                    // Angular frequency w (small omega):
                    const w = 2 * Math.PI * f

                    // Function to make the sound gradually decay:
                    const decayFunction = Math.exp(-0.001 * w * sampleNumber)

                    // Sine function for the fundamental tone:
                    var sample = Math.sin(1 * w * sampleNumber) * decayFunction

                    // Add harmonics (with graduated volume):
                    sample += Math.sin(2 * w * sampleNumber) * decayFunction / 2
                    sample += Math.sin(3 * w * sampleNumber) * decayFunction / 4
                    sample += Math.sin(4 * w * sampleNumber) * decayFunction / 8
                    sample += Math.sin(5 * w * sampleNumber) * decayFunction / 16
                    sample += Math.sin(6 * w * sampleNumber) * decayFunction / 32

                    // Make the sound a little "richer":
                    sample += sample * sample * sample

                    // Raise volume briefly at the beginning (piano keystroke):
                    sample *= 1 + 16 * sampleNumber * Math.exp(-6 * sampleNumber)

                    return sample
                }

                /*
                 * FUNCTION: playSamplesArray
                 *
                 * DESCRIPTION: Audio output of a sample array
                 *
                 * PARAMETER: sampleArray: Array with samples
                 */
                function playSamplesArray(sampleArray)
                {
                    var tempAudioBuffer = new Float32Array(sampleArray.length)

                    for(var sampleNumber = 0; sampleNumber < sampleArray.length; sampleNumber++)
                    {
                        tempAudioBuffer[sampleNumber] = sampleArray[sampleNumber]
                    }

                    var audioBuffer = audioContext.createBuffer(1, tempAudioBuffer.length, audioContext.sampleRate)
                    audioBuffer.copyToChannel(tempAudioBuffer, 0)

                    if(this.bufferSource != null)
                    {
                        this.bufferSource.stop(0)
                        // Stop current audio output, if any, to prevent overlapping.
                    }

                    this.bufferSource = audioContext.createBufferSource()
                    this.bufferSource.buffer = audioBuffer
                    this.bufferSource.connect(audioContext.destination)
                    this.bufferSource.start(0)
                }

                // ========== Creating an audio context ==========

                window.AudioContext = window.AudioContext || window.webkitAudioContext
                var audioContext = new AudioContext()

                // ========== Creating and playing the sample array ==========

                var sampleArray = []
                const volume = 0.25 // factor for amplitude; don't set too high to prevent distortion

                // Create the fundamental tone:

                var noteDuration = 1.5 // duration in s
                const nSamplesFirstNote = audioContext.sampleRate * noteDuration // offset for the interval tone
                var frequency = noteToFrequency(this.currentRootNote)

                for(var sampleNumber = 0; sampleNumber < nSamplesFirstNote; sampleNumber++)
                {
                    sampleArray[sampleNumber] = waveFunction(sampleNumber, frequency) * volume
                }

                // Create the interval tone:

                noteDuration = 5.0
                const nSamplesSecondNote = audioContext.sampleRate * noteDuration
                frequency = noteToFrequency(this.currentRootNote + this.currentInterval)

                for(var sampleNumber = 0; sampleNumber < nSamplesSecondNote; sampleNumber++)
                {
                    sampleArray[sampleNumber + nSamplesFirstNote] = waveFunction(sampleNumber, frequency) * volume

                    // Both samples/notes are written into the same array with
                    // `nSamplesFirstNote` serving as the offset for the second note.
                }

                playSamplesArray(sampleArray)
            }
        }
    })
}
