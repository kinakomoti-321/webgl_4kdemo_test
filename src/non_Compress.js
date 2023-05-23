var canvas = document.createElement("canvas");
canvas.style.position = "fixed";
canvas.style.cursor = "none";
canvas.style.left = canvas.style.top = 0;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);

var song = {
      songData: [
        { // Instrument 0
          i: [
          2, // OSC1_WAVEFORM
          100, // OSC1_VOL
          128, // OSC1_SEMI
          0, // OSC1_XENV
          3, // OSC2_WAVEFORM
          201, // OSC2_VOL
          128, // OSC2_SEMI
          0, // OSC2_DETUNE
          0, // OSC2_XENV
          0, // NOISE_VOL
          0, // ENV_ATTACK
          6, // ENV_SUSTAIN
          29, // ENV_RELEASE
          0, // ENV_EXP_DECAY
          0, // ARP_CHORD
          0, // ARP_SPEED
          0, // LFO_WAVEFORM
          195, // LFO_AMT
          4, // LFO_FREQ
          1, // LFO_FX_FREQ
          3, // FX_FILTER
          50, // FX_FREQ
          184, // FX_RESONANCE
          119, // FX_DIST
          244, // FX_DRIVE
          147, // FX_PAN_AMT
          6, // FX_PAN_FREQ
          84, // FX_DELAY_AMT
          6 // FX_DELAY_TIME
          ],
          // Patterns
          p: [1,1,1,1,1],
          // Columns
          c: [
            {n: [137,,,,144,,,,142,,,,156,,,,154,,,,,,,,137,,,,144,,,,142,,,,156,,,,154],
             f: []}
          ]
        },
        { // Instrument 1
          i: [
          0, // OSC1_WAVEFORM
          255, // OSC1_VOL
          116, // OSC1_SEMI
          79, // OSC1_XENV
          0, // OSC2_WAVEFORM
          255, // OSC2_VOL
          116, // OSC2_SEMI
          0, // OSC2_DETUNE
          83, // OSC2_XENV
          0, // NOISE_VOL
          4, // ENV_ATTACK
          6, // ENV_SUSTAIN
          69, // ENV_RELEASE
          52, // ENV_EXP_DECAY
          0, // ARP_CHORD
          0, // ARP_SPEED
          0, // LFO_WAVEFORM
          0, // LFO_AMT
          0, // LFO_FREQ
          0, // LFO_FX_FREQ
          2, // FX_FILTER
          14, // FX_FREQ
          0, // FX_RESONANCE
          0, // FX_DIST
          32, // FX_DRIVE
          0, // FX_PAN_AMT
          0, // FX_PAN_FREQ
          0, // FX_DELAY_AMT
          0 // FX_DELAY_TIME
          ],
          // Patterns
          p: [,2,2,2,2],
          // Columns
          c: [
            {n: [],
             f: []},
            {n: [147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147,,,,147],
             f: []}
          ]
        },
        { // Instrument 2
          i: [
          0, // OSC1_WAVEFORM
          160, // OSC1_VOL
          128, // OSC1_SEMI
          64, // OSC1_XENV
          0, // OSC2_WAVEFORM
          160, // OSC2_VOL
          128, // OSC2_SEMI
          0, // OSC2_DETUNE
          64, // OSC2_XENV
          210, // NOISE_VOL
          4, // ENV_ATTACK
          7, // ENV_SUSTAIN
          52, // ENV_RELEASE
          85, // ENV_EXP_DECAY
          0, // ARP_CHORD
          0, // ARP_SPEED
          0, // LFO_WAVEFORM
          60, // LFO_AMT
          4, // LFO_FREQ
          1, // LFO_FX_FREQ
          2, // FX_FILTER
          255, // FX_FREQ
          0, // FX_RESONANCE
          0, // FX_DIST
          32, // FX_DRIVE
          61, // FX_PAN_AMT
          5, // FX_PAN_FREQ
          32, // FX_DELAY_AMT
          6 // FX_DELAY_TIME
          ],
          // Patterns
          p: [,,3],
          // Columns
          c: [
            {n: [],
             f: []},
            {n: [],
             f: []},
            {n: [150,,,,,,,,150,,,,,,,,150,,,,,,,,150,,,,,,,,150,,,,,,,,150],
             f: []}
          ]
        },
      ],
      rowLen: 5513,   // In sample lengths
      patternLen: 48,  // Rows per pattern
      endPattern: 4,  // End pattern
      numChannels: 3  // Number of channels
    };
"use strict";

// Some general notes and recommendations:
//  * This code uses modern ECMAScript features, such as ** instead of
//    Math.pow(). You may have to modify the code to make it work on older
//    browsers.
//  * If you're not using all the functionality (e.g. not all oscillator types,
//    or certain effects), you can reduce the size of the player routine even
//    further by deleting the code.


var CPlayer = function() {

    //--------------------------------------------------------------------------
    // Private methods
    //--------------------------------------------------------------------------

    // Oscillators
    var osc_sin = function (value) {
        return Math.sin(value * 6.283184);
    };

    var osc_saw = function (value) {
        return 2 * (value % 1) - 1;
    };

    var osc_square = function (value) {
        return (value % 1) < 0.5 ? 1 : -1;
    };

    var osc_tri = function (value) {
        var v2 = (value % 1) * 4;
        if(v2 < 2) return v2 - 1;
        return 3 - v2;
    };

    var getnotefreq = function (n) {
        // 174.61.. / 44100 = 0.003959503758 (F3)
        return 0.003959503758 * (2 ** ((n - 128) / 12));
    };

    var createNote = function (instr, n, rowLen) {
        var osc1 = mOscillators[instr.i[0]],
            o1vol = instr.i[1],
            o1xenv = instr.i[3]/32,
            osc2 = mOscillators[instr.i[4]],
            o2vol = instr.i[5],
            o2xenv = instr.i[8]/32,
            noiseVol = instr.i[9],
            attack = instr.i[10] * instr.i[10] * 4,
            sustain = instr.i[11] * instr.i[11] * 4,
            release = instr.i[12] * instr.i[12] * 4,
            releaseInv = 1 / release,
            expDecay = -instr.i[13]/16,
            arp = instr.i[14],
            arpInterval = rowLen * (2 **(2 - instr.i[15]));

        var noteBuf = new Int32Array(attack + sustain + release);

        // Re-trig oscillators
        var c1 = 0, c2 = 0;

        // Local variables.
        var j, j2, e, t, rsample, o1t, o2t;

        // Generate one note (attack + sustain + release)
        for (j = 0, j2 = 0; j < attack + sustain + release; j++, j2++) {
            if (j2 >= 0) {
                // Switch arpeggio note.
                arp = (arp >> 8) | ((arp & 255) << 4);
                j2 -= arpInterval;

                // Calculate note frequencies for the oscillators
                o1t = getnotefreq(n + (arp & 15) + instr.i[2] - 128);
                o2t = getnotefreq(n + (arp & 15) + instr.i[6] - 128) * (1 + 0.0008 * instr.i[7]);
            }

            // Envelope
            e = 1;
            if (j < attack) {
                e = j / attack;
            } else if (j >= attack + sustain) {
                e = (j - attack - sustain) * releaseInv;
                e = (1 - e) * (3 ** (expDecay * e));
            }

            // Oscillator 1
            c1 += o1t * e ** o1xenv;
            rsample = osc1(c1) * o1vol;

            // Oscillator 2
            c2 += o2t * e ** o2xenv;
            rsample += osc2(c2) * o2vol;

            // Noise oscillator
            if (noiseVol) {
                rsample += (2 * Math.random() - 1) * noiseVol;
            }

            // Add to (mono) channel buffer
            noteBuf[j] = (80 * rsample * e) | 0;
        }

        return noteBuf;
    };


    //--------------------------------------------------------------------------
    // Private members
    //--------------------------------------------------------------------------

    // Array of oscillator functions
    var mOscillators = [
        osc_sin,
        osc_square,
        osc_saw,
        osc_tri
    ];

    // Private variables set up by init()
    var mSong, mLastRow, mCurrentCol, mNumWords, mMixBuf;


    //--------------------------------------------------------------------------
    // Initialization
    //--------------------------------------------------------------------------

    this.init = function (song) {
        // Define the song
        mSong = song;

        // Init iteration state variables
        mLastRow = song.endPattern;
        mCurrentCol = 0;

        // Prepare song info
        mNumWords =  song.rowLen * song.patternLen * (mLastRow + 1) * 2;

        // Create work buffer (initially cleared)
        mMixBuf = new Int32Array(mNumWords);
    };


    //--------------------------------------------------------------------------
    // Public methods
    //--------------------------------------------------------------------------

    // Generate audio data for a single track
    this.generate = function () {
        // Local variables
        var i, j, b, p, row, col, n, cp,
            k, t, lfor, e, x, rsample, rowStartSample, f, da;

        // Put performance critical items in local variables
        var chnBuf = new Int32Array(mNumWords),
            instr = mSong.songData[mCurrentCol],
            rowLen = mSong.rowLen,
            patternLen = mSong.patternLen;

        // Clear effect state
        var low = 0, band = 0, high;
        var lsample, filterActive = false;

        // Clear note cache.
        var noteCache = [];

         // Patterns
         for (p = 0; p <= mLastRow; ++p) {
            cp = instr.p[p];

            // Pattern rows
            for (row = 0; row < patternLen; ++row) {
                // Execute effect command.
                var cmdNo = cp ? instr.c[cp - 1].f[row] : 0;
                if (cmdNo) {
                    instr.i[cmdNo - 1] = instr.c[cp - 1].f[row + patternLen] || 0;

                    // Clear the note cache since the instrument has changed.
                    if (cmdNo < 17) {
                        noteCache = [];
                    }
                }

                // Put performance critical instrument properties in local variables
                var oscLFO = mOscillators[instr.i[16]],
                    lfoAmt = instr.i[17] / 512,
                    lfoFreq = (2 ** (instr.i[18] - 9)) / rowLen,
                    fxLFO = instr.i[19],
                    fxFilter = instr.i[20],
                    fxFreq = instr.i[21] * 43.23529 * 3.141592 / 44100,
                    q = 1 - instr.i[22] / 255,
                    dist = instr.i[23] * 1e-5,
                    drive = instr.i[24] / 32,
                    panAmt = instr.i[25] / 512,
                    panFreq = 6.283184 * (2 ** (instr.i[26] - 9)) / rowLen,
                    dlyAmt = instr.i[27] / 255,
                    dly = instr.i[28] * rowLen & ~1;  // Must be an even number

                // Calculate start sample number for this row in the pattern
                rowStartSample = (p * patternLen + row) * rowLen;

                // Generate notes for this pattern row
                for (col = 0; col < 4; ++col) {
                    n = cp ? instr.c[cp - 1].n[row + col * patternLen] : 0;
                    if (n) {
                        if (!noteCache[n]) {
                            noteCache[n] = createNote(instr, n, rowLen);
                        }

                        // Copy note from the note cache
                        var noteBuf = noteCache[n];
                        for (j = 0, i = rowStartSample * 2; j < noteBuf.length; j++, i += 2) {
                          chnBuf[i] += noteBuf[j];
                        }
                    }
                }

                // Perform effects for this pattern row
                for (j = 0; j < rowLen; j++) {
                    // Dry mono-sample
                    k = (rowStartSample + j) * 2;
                    rsample = chnBuf[k];

                    // We only do effects if we have some sound input
                    if (rsample || filterActive) {
                        // State variable filter
                        f = fxFreq;
                        if (fxLFO) {
                            f *= oscLFO(lfoFreq * k) * lfoAmt + 0.5;
                        }
                        f = 1.5 * Math.sin(f);
                        low += f * band;
                        high = q * (rsample - band) - low;
                        band += f * high;
                        rsample = fxFilter == 3 ? band : fxFilter == 1 ? high : low;

                        // Distortion
                        if (dist) {
                            rsample *= dist;
                            rsample = rsample < 1 ? rsample > -1 ? osc_sin(rsample*.25) : -1 : 1;
                            rsample /= dist;
                        }

                        // Drive
                        rsample *= drive;

                        // Is the filter active (i.e. still audiable)?
                        filterActive = rsample * rsample > 1e-5;

                        // Panning
                        t = Math.sin(panFreq * k) * panAmt + 0.5;
                        lsample = rsample * (1 - t);
                        rsample *= t;
                    } else {
                        lsample = 0;
                    }

                    // Delay is always done, since it does not need sound input
                    if (k >= dly) {
                        // Left channel = left + right[-p] * t
                        lsample += chnBuf[k-dly+1] * dlyAmt;

                        // Right channel = right + left[-p] * t
                        rsample += chnBuf[k-dly] * dlyAmt;
                    }

                    // Store in stereo channel buffer (needed for the delay effect)
                    chnBuf[k] = lsample | 0;
                    chnBuf[k+1] = rsample | 0;

                    // ...and add to stereo mix buffer
                    mMixBuf[k] += lsample | 0;
                    mMixBuf[k+1] += rsample | 0;
                }
            }
        }

        // Next iteration. Return progress (1.0 == done!).
        mCurrentCol++;
        return mCurrentCol / mSong.numChannels;
    };

    // Create a AudioBuffer from the generated audio data
    this.createAudioBuffer = function(context) {
        var buffer = context.createBuffer(2, mNumWords / 2, 44100);
        for (var i = 0; i < 2; i ++) {
            var data = buffer.getChannelData(i);
            for (var j = i; j < mNumWords; j += 2) {
                data[j >> 1] = mMixBuf[j] / 65536;
            }
        }
        return buffer;
    };
    
};
document.addEventListener('click', function() {
var gl = canvas.getContext("webgl2") || canvas.getContext("experimental-webgl2");
var compileShader = function(prog, src, type){
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src.replace(/^\n/, ""));
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
    gl.deleteShader(sh);
};

vs = `
#version 300 es
void main()
{ 
    gl_Position = vec4(ivec2(gl_VertexID&1,gl_VertexID>>1)*2-1,0,1);
}
`
fs = `
#version 300 es
precision highp float;out vec4 f;uniform vec2 v;uniform float m;
#define PI 3.141
float y;float n(float y){return fract(sin(y*127.1)*43758.5453);}vec2 s(vec2 y){return fract(sin(vec2(dot(y,vec2(127.1,311.7)),dot(y,vec2(311.7,127.1))))*43758.5453);}vec2 n(vec2 v,float y){float f=cos(y),z=sin(y);return vec2(v.x*f-v.y*z,v.x*z+v.y*f);}float t(float y){float v=mod(y,1.);return sin(v*40.)*step(v,PI/40.);}float r(float y){return mix(n(floor(y)),n(floor(y+1.)),smoothstep(.4,.5,fract(y)));}struct GridResult{vec2 cell;float d;vec3 n;};GridResult r(vec3 y,vec3 v){GridResult f;f.cell=floor(y+v*.001).xz+.5;vec2 m=(-y.xz+f.cell)/v.xz,d=m+abs(.5/v).xz;f.d=min(d.x,d.y);return f;}float s(vec3 y,vec3 v){vec3 f=abs(y)-v;return length(max(f,0.))+min(0.,max(max(f.x,f.y),f.z));}float n(vec3 v,vec2 f,inout int m){vec3 d=v;d.xz-=f;vec3 z=vec3(0,r(y+fract(sin(dot(f,vec2(127.1,311.7)))*43758.5453)),0);float x=s(d-z,vec3(.5)),P=length(v-vec3(0,3,0))-1.-.1*t(y);vec3 c=abs(v)-vec3(0,3,0);float l=1e3;for(int i=0;i<4;i++)c*=1.4,c=abs(c-vec3(3)),c.xy=n(c.xy,r(y)),c.yz=n(c.yz,r(y)),l=min(s(c,vec3(1,2,1))/1.4,l);m=x<P?0:1;m=x<l?0:1;return min(x,l);}vec3 t(vec3 y,vec2 v){vec2 f=vec2(0,1e-4);int l=0;return normalize(vec3(n(y+f.yxx,v,l)-n(y-f.yxx,v,l),n(y+f.xyx,v,l)-n(y-f.xyx,v,l),n(y+f.xxy,v,l)-n(y-f.xxy,v,l)));}void main(){vec2 d=((gl_FragCoord.xy+s(gl_FragCoord.xy+vec2(m,m*2.)))*2.-v.xy)/v.y;y=m;vec3 l=vec3(0,4,20);l.xz=n(l.xz,cos(y)*PI);l.yz=n(l.yz,sin(y)*.15);vec3 c=normalize(vec3(0,4,0)-l),x=normalize(cross(c,vec3(0,1,0)));float z=2.5;z+=r(y)*2.-1.;vec3 i=normalize(x*d.x+normalize(cross(x,c))*d.y+c*z);float G=.01;vec3 a=l+i*G;float P=0.;GridResult h;float g;vec3 u=vec3(1),o=vec3(0);for(int C=0;C<100;C++){if(P<=G)h=r(a,i),P+=h.d;int I=0;g=n(a,h.cell,I);G=min(G+g,P);a=l+i*G;if(g<.01){vec3 A=vec3(0);if(I==0){vec3 B=mod(a,1.);A=vec3(B.x*B.z);A=vec3(0);}else A=vec3(1);vec3 B=t(a,h.cell);float D=dot(B,-i);l=a;i=reflect(i,B);G=0.;a=l+i*.01;P=0.;o+=A*u*D;u*=.8;}}vec3 C=vec3(0);C=o;C+=i.y*.1;f=vec4(C,1);}`

var p = gl.createProgram();
compileShader(p, vs, gl.VERTEX_SHADER);
compileShader(p, fs, gl.FRAGMENT_SHADER);
gl.linkProgram(p);
gl.useProgram(p);
gl.uniform2f(gl.getUniformLocation(p, "v"), canvas.width, canvas.height);

var audio = new AudioContext();
var player = new CPlayer();
player.init(song);
player.generate(0);
player.generate(0);

var audioBuffer1 = player.createAudioBuffer(audio);
var node = audio.createBufferSource();

node.buffer = audioBuffer1;
node.loop = true;
node.connect(audio.destination);
node.start(0);

var zero = Date.now();

render();

function render(){ 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(gl.getUniformLocation(p, "m"), (Date.now() - zero) * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    setTimeout(render, 1000/60);
};
});