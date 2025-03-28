import coptic_msdf_png from '../../assets/coptic_msdf.png';
import gothic_msdf_png from '../../assets/gothic_msdf.png';
import gtarg_alientext_msdf_png from '../../assets/gtarg_alientext_msdf.png';
import gtarg_tenretniolleh_msdf_png from '../../assets/gtarg_tenretniolleh_msdf.png';
import huberfish_a_msdf_png from '../../assets/huberfish_a_msdf.png';
import huberfish_d_msdf_png from '../../assets/huberfish_d_msdf.png';
import matrixcode_msdf_png from '../../assets/matrixcode_msdf.png';
import megacity_msdf_png from '../../assets/megacity_msdf.png';
import mesh_png from '../../assets/mesh.png';
import metal_png from '../../assets/metal.png';
import neomatrixology_msdf_png from '../../assets/neomatrixology_msdf.png';
import pixel_grid_png from '../../assets/pixel_grid.png';
import resurrections_glint_msdf_png from '../../assets/resurrections_glint_msdf.png';
import resurrections_msdf_png from '../../assets/resurrections_msdf.png';
import sand_png from '../../assets/sand.png';

import bloomBlur_wgsl from '../../shaders/wgsl/bloomBlur.wgsl';
import bloomCombine_wgsl from '../../shaders/wgsl/bloomCombine.wgsl';
import endPass_wgsl from '../../shaders/wgsl/endPass.wgsl';
import imagePass_wgsl from '../../shaders/wgsl/imagePass.wgsl';
import mirrorPass_wgsl from '../../shaders/wgsl/mirrorPass.wgsl';
import palettePass_wgsl from '../../shaders/wgsl/palettePass.wgsl';
import rainPass_wgsl from '../../shaders/wgsl/rainPass.wgsl';
import stripePass_wgsl from '../../shaders/wgsl/stripePass.wgsl';

const images = {
	'assets/coptic_msdf.png': coptic_msdf_png,
	'assets/gothic_msdf.png': gothic_msdf_png,
	'assets/gtarg_alientext_msdf.png': gtarg_alientext_msdf_png,
	'assets/gtarg_tenretniolleh_msdf.png': gtarg_tenretniolleh_msdf_png,
	'assets/huberfish_a_msdf.png': huberfish_a_msdf_png,
	'assets/huberfish_d_msdf.png': huberfish_d_msdf_png,
	'assets/matrixcode_msdf.png': matrixcode_msdf_png,
	'assets/megacity_msdf.png': megacity_msdf_png,
	'assets/mesh.png': mesh_png,
	'assets/metal.png': metal_png,
	'assets/neomatrixology_msdf.png': neomatrixology_msdf_png,
	'assets/pixel_grid.png': pixel_grid_png,
	'assets/resurrections_glint_msdf.png': resurrections_glint_msdf_png,
	'assets/resurrections_msdf.png': resurrections_msdf_png,
	'assets/sand.png': sand_png,
}

const textShaders = {
	'shaders/wgsl/bloomBlur.wgsl': bloomBlur_wgsl,
	'shaders/wgsl/bloomCombine.wgsl': bloomCombine_wgsl,
	'shaders/wgsl/endPass.wgsl': endPass_wgsl,
	'shaders/wgsl/imagePass.wgsl': imagePass_wgsl,
	'shaders/wgsl/mirrorPass.wgsl': mirrorPass_wgsl,
	'shaders/wgsl/palettePass.wgsl': palettePass_wgsl,
	'shaders/wgsl/rainPass.wgsl': rainPass_wgsl,
	'shaders/wgsl/stripePass.wgsl': stripePass_wgsl,
}

const loadTexture = async (device, url) => {
	if (url == null) {
		return device.createTexture({
			size: [1, 1, 1],
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
		});
	}

	const img = new Image();
	img.src = images[url] ?? url;
	await img.decode();
	const source = await createImageBitmap(img);
	const size = [source.width, source.height, 1];

	const texture = device.createTexture({
		size,
		format: "rgba8unorm",
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
	});

	device.queue.copyExternalImageToTexture({ source, flipY: true }, { texture }, size);

	return texture;
};

const makeRenderTarget = (device, size, format, mipLevelCount = 1) =>
	device.createTexture({
		size: [...size, 1],
		mipLevelCount,
		format,
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
	});

const makeComputeTarget = (device, size, mipLevelCount = 1) =>
	device.createTexture({
		size: [...size, 1],
		mipLevelCount,
		format: "rgba8unorm",
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING,
	});

const loadShader = async (device, url) => {
	// const response = await fetch(url);
	// const code = await response.text();
	const code = textShaders[url];
	console.log(`Loading shader from ${url}`, code);
	return {
		code,
		module: device.createShaderModule({ code }),
	};
};

const makeUniformBuffer = (device, uniforms, data = null) => {
	const buffer = device.createBuffer({
		size: uniforms.minSize,
		usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		mappedAtCreation: data != null,
	});
	if (data != null) {
		uniforms.toBuffer(data, buffer.getMappedRange());
		buffer.unmap();
	}
	return buffer;
};

const make1DTexture = (device, rgbas) => {
	const size = [rgbas.length];
	const texture = device.createTexture({
		size,
		// dimension: "1d",
		format: "rgba8unorm",
		usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
	});
	const data = new Uint8ClampedArray(rgbas.map((color) => color.map((f) => f * 0xff)).flat());
	device.queue.writeTexture({ texture }, data, {}, size);
	return texture;
};

const makeBindGroup = (device, pipeline, index, entries) =>
	device.createBindGroup({
		layout: pipeline.getBindGroupLayout(index),
		entries: entries
			.map((resource) => (resource instanceof GPUBuffer ? { buffer: resource } : resource))
			.map((resource, binding) => ({
				binding,
				resource,
			})),
	});

const makePass = (name, loaded, build, run) => ({
	loaded: loaded ?? Promise.resolve(),
	build: build ?? ((size, inputs) => inputs),
	run: (encoder, shouldRender) => {
		encoder.pushDebugGroup(`Pass "${name}"`);
		run?.(encoder, shouldRender);
		encoder.popDebugGroup();
	},
});

const makePipeline = async (context, steps) => {
	steps = steps.filter((f) => f != null).map((f) => f(context));
	await Promise.all(steps.map((step) => step.loaded));
	return {
		steps,
		build: (canvasSize) => steps.reduce((outputs, step) => step.build(canvasSize, outputs), null),
		run: (encoder, shouldRender) => steps.forEach((step) => step.run(encoder, shouldRender)),
	};
};

export { makeRenderTarget, makeComputeTarget, make1DTexture, loadTexture, loadShader, makeUniformBuffer, makePass, makePipeline, makeBindGroup };
