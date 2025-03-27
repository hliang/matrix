import bloomPass_blur_frag_glsl from '../../shaders/glsl/bloomPass.blur.frag.glsl'
import bloomPass_combine_frag_glsl from '../../shaders/glsl/bloomPass.combine.frag.glsl'
import bloomPass_highPass_frag_glsl from '../../shaders/glsl/bloomPass.highPass.frag.glsl'
import imagePass_frag_glsl from '../../shaders/glsl/imagePass.frag.glsl'
import mirrorPass_frag_glsl from '../../shaders/glsl/mirrorPass.frag.glsl'
import palettePass_frag_glsl from '../../shaders/glsl/palettePass.frag.glsl'
import quiltPass_frag_glsl from '../../shaders/glsl/quiltPass.frag.glsl'
import rainPass_effect_frag_glsl from '../../shaders/glsl/rainPass.effect.frag.glsl'
import rainPass_frag_glsl from '../../shaders/glsl/rainPass.frag.glsl'
import rainPass_intro_frag_glsl from '../../shaders/glsl/rainPass.intro.frag.glsl'
import rainPass_raindrop_frag_glsl from '../../shaders/glsl/rainPass.raindrop.frag.glsl'
import rainPass_symbol_frag_glsl from '../../shaders/glsl/rainPass.symbol.frag.glsl'
import rainPass_vert_glsl from '../../shaders/glsl/rainPass.vert.glsl'
import stripePass_frag_glsl from '../../shaders/glsl/stripePass.frag.glsl'

const textShaders = {
	'shaders/glsl/bloomPass.blur.frag.glsl': bloomPass_blur_frag_glsl,
	'shaders/glsl/bloomPass.combine.frag.glsl': bloomPass_combine_frag_glsl,
	'shaders/glsl/bloomPass.highPass.frag.glsl': bloomPass_highPass_frag_glsl,
	'shaders/glsl/imagePass.frag.glsl': imagePass_frag_glsl,
	'shaders/glsl/mirrorPass.frag.glsl': mirrorPass_frag_glsl,
	'shaders/glsl/palettePass.frag.glsl': palettePass_frag_glsl,
	'shaders/glsl/quiltPass.frag.glsl': quiltPass_frag_glsl,
	'shaders/glsl/rainPass.effect.frag.glsl': rainPass_effect_frag_glsl,
	'shaders/glsl/rainPass.frag.glsl': rainPass_frag_glsl,
	'shaders/glsl/rainPass.intro.frag.glsl': rainPass_intro_frag_glsl,
	'shaders/glsl/rainPass.raindrop.frag.glsl': rainPass_raindrop_frag_glsl,
	'shaders/glsl/rainPass.symbol.frag.glsl': rainPass_symbol_frag_glsl,
	'shaders/glsl/rainPass.vert.glsl': rainPass_vert_glsl,
	'shaders/glsl/stripePass.frag.glsl': stripePass_frag_glsl,
}

const makePassTexture = (regl, halfFloat) =>
	regl.texture({
		width: 1,
		height: 1,
		type: halfFloat ? "half float" : "uint8",
		wrap: "clamp",
		min: "linear",
		mag: "linear",
	});

const makePassFBO = (regl, halfFloat) => regl.framebuffer({ color: makePassTexture(regl, halfFloat) });

const makeDoubleBuffer = (regl, props) => {
	const state = Array(2)
		.fill()
		.map(() =>
			regl.framebuffer({
				color: regl.texture(props),
				depthStencil: false,
			})
		);
	return {
		front: ({ tick }) => state[tick % 2],
		back: ({ tick }) => state[(tick + 1) % 2],
	};
};

const isPowerOfTwo = (x) => Math.log2(x) % 1 == 0;

const loadImage = (regl, url, mipmap) => {
	let texture = regl.texture([[0]]);
	let loaded = false;
	return {
		texture: () => {
			if (!loaded && url != null) {
				console.warn(`texture still loading: ${url}`);
			}
			return texture;
		},
		width: () => {
			if (!loaded && url != null) {
				console.warn(`texture still loading: ${url}`);
			}
			return loaded ? texture.width : 1;
		},
		height: () => {
			if (!loaded && url != null) {
				console.warn(`texture still loading: ${url}`);
			}
			return loaded ? texture.height : 1;
		},
		loaded: (async () => {
			if (url != null) {
				const data = new Image();
				data.crossOrigin = "anonymous";
				data.src = url;
				await data.decode();
				loaded = true;
				if (mipmap) {
					if (!isPowerOfTwo(data.width) || !isPowerOfTwo(data.height)) {
						console.warn(`Can't mipmap a non-power-of-two image: ${url}`);
					}
					mipmap = false;
				}
				texture = regl.texture({
					data,
					mag: "linear",
					min: mipmap ? "mipmap" : "linear",
					flipY: true,
				});
			}
		})(),
	};
};

const loadText = (url) => {
	return {
	  text: () => textShaders[shaderContent],
	  loaded: Promise.resolve(), // Immediately resolved (no async needed)
	};
};

const makeFullScreenQuad = (regl, uniforms = {}, context = {}) =>
	regl({
		vert: `
		precision mediump float;
		attribute vec2 aPosition;
		varying vec2 vUV;
		void main() {
			vUV = 0.5 * (aPosition + 1.0);
			gl_Position = vec4(aPosition, 0, 1);
		}
	`,

		frag: `
		precision mediump float;
		varying vec2 vUV;
		uniform sampler2D tex;
		void main() {
			gl_FragColor = texture2D(tex, vUV);
		}
	`,

		attributes: {
			aPosition: [-4, -4, 4, -4, 0, 4],
		},
		count: 3,

		uniforms: {
			...uniforms,
			time: regl.context("time"),
			tick: regl.context("tick"),
		},

		context,

		depth: { enable: false },
	});

const make1DTexture = (regl, rgbas) => {
	const data = rgbas.map((rgba) => rgba.map((f) => Math.floor(f * 0xff))).flat();
	return regl.texture({
		data,
		width: data.length / 4,
		height: 1,
		format: "rgba",
		mag: "linear",
		min: "linear",
	});
};

const makePass = (outputs, ready, setSize, execute) => ({
	outputs: outputs ?? {},
	ready: ready ?? Promise.resolve(),
	setSize: setSize ?? (() => {}),
	execute: execute ?? (() => {}),
});

const makePipeline = (context, steps) =>
	steps.filter((f) => f != null).reduce((pipeline, f, i) => [...pipeline, f(context, i == 0 ? null : pipeline[i - 1].outputs)], []);

export { makePassTexture, makePassFBO, makeDoubleBuffer, loadImage, loadText, makeFullScreenQuad, make1DTexture, makePass, makePipeline };
