﻿import { GLSL3, HalfFloatType, LinearFilter, NearestFilter, Uniform, WebGLMultipleRenderTargets } from "three"
import svgfTemporalResolve from "../shader/svgfTemporalResolve.frag"
import { TemporalResolvePass } from "../temporal-resolve/TemporalResolvePass"

const defaultSVGFTemporalResolvePassOptions = {
	moment: true
}
export class SVGFTemporalResolvePass extends TemporalResolvePass {
	constructor(scene, camera, options = defaultSVGFTemporalResolvePassOptions) {
		const temporalResolvePassRenderTarget = new WebGLMultipleRenderTargets(1, 1, 3, {
			type: HalfFloatType,
			depthBuffer: false
		})

		options = {
			...defaultSVGFTemporalResolvePassOptions,
			...options,
			...{
				customComposeShader: svgfTemporalResolve,
				renderTarget: temporalResolvePassRenderTarget,
				renderVelocity: false,
				blendStatic: true,
				catmullRomSampling: true
			}
		}

		super(scene, camera, options)

		const momentBuffers = /* glsl */ `
		layout(location = 0) out vec4 gDiffuse;
		layout(location = 1) out vec4 gSpecular;
		layout(location = 2) out vec4 gMoment;

		uniform sampler2D lastSpecularTexture;
		uniform sampler2D specularTexture;
		uniform sampler2D lastMomentTexture;
		`

		this.fullscreenMaterial.fragmentShader = momentBuffers + this.fullscreenMaterial.fragmentShader

		const momentUniforms = {
			lastSpecularTexture: new Uniform(null),
			specularTexture: new Uniform(null),
			lastMomentTexture: new Uniform(null)
		}

		this.fullscreenMaterial.uniforms = {
			...this.fullscreenMaterial.uniforms,
			...momentUniforms
		}

		this.fullscreenMaterial.glslVersion = GLSL3

		this.renderTarget.texture[0].type = HalfFloatType
		this.renderTarget.texture[0].minFilter = LinearFilter
		this.renderTarget.texture[0].magFilter = LinearFilter
		this.renderTarget.texture[0].needsUpdate = true

		this.renderTarget.texture[1].type = HalfFloatType
		this.renderTarget.texture[1].minFilter = LinearFilter
		this.renderTarget.texture[1].magFilter = LinearFilter
		this.renderTarget.texture[1].needsUpdate = true

		this.renderTarget.texture[2].type = HalfFloatType
		this.renderTarget.texture[2].minFilter = NearestFilter
		this.renderTarget.texture[2].magFilter = NearestFilter
		this.renderTarget.texture[2].needsUpdate = true

		this.copyPass.fullscreenMaterial.uniforms.inputTexture4.value = this.momentTexture
		this.copyPass.fullscreenMaterial.uniforms.inputTexture5.value = this.specularTexture

		const lastMomentTexture = this.copyPass.renderTarget.texture[0].clone()
		lastMomentTexture.isRenderTargetTexture = true
		this.copyPass.renderTarget.texture.push(lastMomentTexture)
		this.copyPass.fullscreenMaterial.defines.textureCount++

		lastMomentTexture.type = HalfFloatType
		lastMomentTexture.minFilter = NearestFilter
		lastMomentTexture.magFilter = NearestFilter
		lastMomentTexture.needsUpdate = true

		this.fullscreenMaterial.uniforms.lastMomentTexture.value = lastMomentTexture

		const lastSpecularTexture = this.copyPass.renderTarget.texture[0].clone()
		lastSpecularTexture.isRenderTargetTexture = true
		this.copyPass.renderTarget.texture.push(lastSpecularTexture)
		this.copyPass.fullscreenMaterial.defines.textureCount++

		lastSpecularTexture.type = HalfFloatType
		lastSpecularTexture.minFilter = LinearFilter
		lastSpecularTexture.magFilter = LinearFilter
		lastSpecularTexture.needsUpdate = true

		this.fullscreenMaterial.uniforms.lastSpecularTexture.value = lastSpecularTexture
	}

	get texture() {
		return this.renderTarget.texture[0]
	}

	get specularTexture() {
		return this.renderTarget.texture[1]
	}

	get momentTexture() {
		return this.renderTarget.texture[2]
	}
}
