// GENERATED: run node scripts/generate-sky-tsl.mjs; original sky/cloud/aurora equations.
import * as TSL from '../vendor/webgpu-r170/three.webgpu.js';
// Three.js Transpiler r170

export function createSkyGraph(uniforms) {
const uTop=TSL.reference('value',uniforms.uTop.value?.isColor?'color':'vec3',uniforms.uTop);
const uHorizon=TSL.reference('value',uniforms.uHorizon.value?.isColor?'color':'vec3',uniforms.uHorizon);
const uWarm=TSL.reference('value',uniforms.uWarm.value?.isColor?'color':'vec3',uniforms.uWarm);
const uCloud=TSL.reference('value',uniforms.uCloud.value?.isColor?'color':'vec3',uniforms.uCloud);
const uSun=TSL.reference('value',uniforms.uSun.value?.isColor?'color':'vec3',uniforms.uSun);
const uNight=TSL.reference('value',uniforms.uNight.value?.isColor?'color':'float',uniforms.uNight);
const uSunY=TSL.reference('value',uniforms.uSunY.value?.isColor?'color':'float',uniforms.uSunY);
const uTime=TSL.reference('value',uniforms.uTime.value?.isColor?'color':'float',uniforms.uTime);
const uReady=TSL.reference('value',uniforms.uReady.value?.isColor?'color':'float',uniforms.uReady);
const uOvercast=TSL.reference('value',uniforms.uOvercast.value?.isColor?'color':'float',uniforms.uOvercast);
const uMist=TSL.reference('value',uniforms.uMist.value?.isColor?'color':'float',uniforms.uMist);
const uAurora=TSL.reference('value',uniforms.uAurora.value?.isColor?'color':'float',uniforms.uAurora);
const uPaintedSky=TSL.texture(uniforms.uPaintedSky.value);
const uCloudShadow=TSL.reference('value',uniforms.uCloudShadow.value?.isColor?'color':'vec3',uniforms.uCloudShadow);
const vDirection=TSL.varying(TSL.positionGeometry);
const textureGrad=(image,uv,dx,dy)=>image.uv(uv).grad(dx,dy);

	const { vec2, dot, sin, fract, Fn, float, floor, dFdx, dFdy, vec3, sub, min, smoothstep, mix, atan2, clamp, asin, pow, max, mul, add, color, vec4, If, time, fwidth, int, cos, abs, exp, Loop, normalize, mod, length, step, cross } = TSL;

	const hashSky = /*#__PURE__*/ Fn( ( [ p_immutable ] ) => {

		const p = vec2( p_immutable ).toVar();

		return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ).mul( 43758.5453 ) );

	} ).setLayout( {
		name: 'hashSky',
		type: 'float',
		inputs: [
			{ name: 'p', type: 'vec2' }
		]
	} );

	const wrapGradient = /*#__PURE__*/ Fn( ( [ value_immutable ] ) => {

		const value = float( value_immutable ).toVar();

		return value.sub( floor( value.add( .5 ) ) );

	} ).setLayout( {
		name: 'wrapGradient',
		type: 'float',
		inputs: [
			{ name: 'value', type: 'float' }
		]
	} );

	const paintedPanorama = /*#__PURE__*/ Fn( ( [ u_immutable, v_immutable ] ) => {

		const v = float( v_immutable ).toVar();
		const u = float( u_immutable ).toVar();
		const dx = vec2( wrapGradient( dFdx( u ) ), dFdx( v ) ).toVar(), dy = vec2( wrapGradient( dFdy( u ) ), dFdy( v ) ).toVar();
		const original = vec3( textureGrad( uPaintedSky, vec2( u, v ), dx, dy ) ).toVar();
		const bridge = vec3( textureGrad( uPaintedSky, vec2( fract( u.add( .5 ) ), v ), dx, dy ) ).toVar();

		return mix( bridge, original, smoothstep( .008, .042, min( u, sub( 1., u ) ) ) );

	} ).setLayout( {
		name: 'paintedPanorama',
		type: 'vec3',
		inputs: [
			{ name: 'u', type: 'float' },
			{ name: 'v', type: 'float' }
		]
	} );

	const paintedClouds = /*#__PURE__*/ Fn( ( [ d_immutable, light_immutable ] ) => {

		const light = vec3( light_immutable ).toVar();
		const d = vec3( d_immutable ).toVar();
		const u = float( atan2( d.z, d.x ).div( 6.28318530718 ).add( .5 ) ).toVar();
		const altitude = float( asin( clamp( d.y, 0., 1. ) ).mul( 2. ).div( 3.14159265359 ) ).toVar();
		const v = float( pow( altitude, .78 ).mul( .94 ).add( .055 ) ).toVar();
		const paint = vec3( paintedPanorama( u, clamp( v, 0., 1. ) ) ).toVar();
		const mask = float( smoothstep( .024, .185, paint.r.sub( paint.b.mul( .43 ) ) ) ).toVar();
		mask.mulAssign( smoothstep( .008, .032, d.y ).mul( sub( 1., smoothstep( .88, .995, altitude ) ) ).mul( uReady ) );
		const pigment = float( dot( paint, vec3( .27, .58, .15 ) ) ).toVar();
		const shade = float( smoothstep( .22, .91, pigment ) ).toVar();
		const color = vec3( mix( uCloudShadow, uCloud, shade ) ).toVar();
		const rim = float( smoothstep( .32, .85, pigment ).mul( smoothstep( .015, .24, paint.r.sub( paint.b ) ) ) ).toVar();
		const sunward = float( add( .35, mul( .65, pow( max( 0., dot( d, light ) ), 3. ) ) ) ).toVar();
		color.assign( mix( color, uWarm, rim.mul( sunward ).mul( .58 ).mul( sub( 1., uNight ) ) ) );
		color.mulAssign( add( .95, pigment.mul( .10 ) ) );
		const moonClear = float( smoothstep( .996, .9994, dot( d, light ) ).mul( uNight ) ).toVar();
		mask.mulAssign( sub( 1., moonClear.mul( .88 ) ) );

		return vec4( color, clamp( mask, 0., 1. ) );

	} ).setLayout( {
		name: 'paintedClouds',
		type: 'vec4',
		inputs: [
			{ name: 'd', type: 'vec3' },
			{ name: 'light', type: 'vec3' }
		]
	} );

	const paintedAurora = /*#__PURE__*/ Fn( ( [ d_immutable, time_immutable ] ) => {

		const time = float( time_immutable ).toVar();
		const d = vec3( d_immutable ).toVar();

		If( d.y.lessThan( .03 ).or( d.y.greaterThan( .70 ) ), () => {

			return vec3( 0. );

		} );

		const phi = float( atan2( d.z, d.x ) ).toVar(), height = float( d.y ).toVar(), drift = float( time.mul( .018 ) ).toVar();
		const pixelAngle = float( max( .0001, fwidth( phi.div( 6.28318530718 ) ).mul( 6.28318530718 ) ) ).toVar();
		const threadDetail = float( sub( 1., smoothstep( .015, .065, pixelAngle ) ) ).toVar();
		const glow = vec3( 0. ).toVar();

		Loop( { start: int( 0 ), end: int( 3 ) }, ( { i } ) => {

			const layer = float( i ).toVar(), centre = float( add( - 2.4, layer.mul( 2.25 ) ) ).toVar();
			const delta = float( atan2( sin( phi.sub( centre ) ), cos( phi.sub( centre ) ) ) ).toVar();
			const arc = float( sub( 1., smoothstep( .55, 1.48, abs( delta ) ) ) ).toVar();
			const folds = float( sin( delta.mul( 3. ).add( drift ).add( layer.mul( 2. ) ) ).mul( .045 ).add( sin( delta.mul( 7. ).sub( drift.mul( .7 ) ).add( layer ) ).mul( .023 ) ) ).toVar();
			const base = float( add( .15, layer.mul( .018 ) ).add( folds ) ).toVar();
			const rise = float( max( 0., height.sub( base ) ) ).toVar();
			const curtain = float( smoothstep( base.sub( .025 ), base.add( .028 ), height ).mul( exp( rise.negate().mul( 7.5 ) ) ).mul( sub( 1., smoothstep( .47, .70, height ) ) ) ).toVar();
			const strands = float( add( .68, sin( phi.mul( 64. ).add( sin( phi.mul( 9. ).add( drift ) ).mul( 2.6 ) ).add( time.mul( .11 ) ).add( layer ) ).mul( .16 ).mul( threadDetail ) ) ).toVar();
			strands.addAssign( sin( phi.mul( 137. ).sub( drift.mul( 2. ) ).add( layer ) ).mul( .065 ).mul( threadDetail ) );
			const colour = vec3( mix( vec3( .065, .47, .29 ), vec3( .22, .095, .32 ), smoothstep( .035, .25, rise ) ) ).toVar();
			const breath = float( add( .88, mul( .12, sin( time.mul( .047 ).add( layer.mul( 1.9 ) ) ) ) ) ).toVar();
			glow.addAssign( colour.mul( curtain ).mul( arc ).mul( strands ).mul( breath ).mul( .96 ) );

		} );

		return glow.mul( smoothstep( .03, .10, height ) );

	} ).setLayout( {
		name: 'paintedAurora',
		type: 'vec3',
		inputs: [
			{ name: 'd', type: 'vec3' },
			{ name: 'time', type: 'float' }
		]
	} );

	const skyFragment = /*#__PURE__*/ Fn( () => {

		const d = vec3( normalize( vDirection ) ).toVar();
		const h = float( max( 0., d.y ) ).toVar();
		const col = vec3( mix( uHorizon, uTop, pow( smoothstep( 0., .88, h ), .58 ) ) ).toVar();
		const sunDirection = vec3( normalize( vec3( - .68, uSunY, - .72 ) ) ).toVar();
		const disc = float( dot( d, sunDirection ) ).toVar();
		const glow = float( pow( max( 0., disc ), 18. ).mul( .19 ) ).toVar();
		col.assign( mix( col, uWarm, glow.mul( sub( 1., uNight ) ) ) );
		const sun = float( smoothstep( .9995, .99975, disc ).mul( sub( 1., uNight ) ) ).toVar();
		col.assign( mix( col, uSun, sun.mul( .82 ) ) );
		const clouds = vec4( paintedClouds( d, sunDirection ) ).toVar();
		clouds.a.assign( clamp( clouds.a.mul( add( 1., uOvercast.mul( .35 ) ) ).add( uOvercast.mul( .08 ).mul( sub( 1., h ) ) ), 0., 1. ) );
		col.assign( mix( col, clouds.rgb, clouds.a ) );
		const visibleNight = float( uNight.mul( sub( 1., clouds.a.mul( .86 ) ) ) ).toVar();

		If( uNight.greaterThan( .20 ).and( uAurora.greaterThan( .001 ) ), () => {

			col.addAssign( paintedAurora( d, uTime ).mul( uAurora ).mul( smoothstep( .20, .85, uNight ) ).mul( sub( 1., clouds.a.mul( .90 ) ) ).mul( sub( 1., uOvercast.mul( .70 ) ) ).mul( sub( 1., uMist.mul( .60 ) ) ) );

		} );

		const u = float( atan2( d.z, d.x ).div( 6.28318530718 ).add( .5 ) ).toVar(), v = float( clamp( asin( clamp( d.y, 0., 1. ) ).mul( 2. ).div( 3.14159265359 ), 0., 1. ) ).toVar();
		const grid = vec2( u.mul( 512. ), v.mul( 170. ) ).toVar(), cell = vec2( floor( grid ) ).toVar(), fp = vec2( fract( grid ).sub( .5 ) ).toVar();
		const seed = float( hashSky( vec2( mod( cell.x, 512. ), cell.y ) ) ).toVar(), radius = float( mix( .04, .16, pow( seed, 5. ) ) ).toVar();
		const dx = float( wrapGradient( dFdx( u ) ).mul( 512. ) ).toVar(), dy = float( wrapGradient( dFdy( u ) ).mul( 512. ) ).toVar();
		const aa = float( max( .012, max( abs( dx ).add( abs( dy ) ), fwidth( grid.y ) ).mul( .38 ) ) ).toVar();
		const star = float( sub( 1., smoothstep( radius, radius.add( aa ), length( fp ) ) ).mul( step( .985, seed ) ).mul( smoothstep( .05, .16, d.y ) ).mul( sub( 1., smoothstep( .97, .999, d.y ) ) ) ).toVar();
		col.addAssign( mix( vec3( .59, .72, 1. ), vec3( 1., .91, .78 ), hashSky( cell.add( 15. ) ) ).mul( star ).mul( visibleNight ).mul( add( .7, seed.mul( .8 ) ) ).mul( add( .93, mul( .07, sin( seed.mul( 100. ).add( uTime.mul( .35 ) ) ) ) ) ) );
		const moonSide = vec3( normalize( cross( vec3( 0., 1., 0. ), sunDirection ) ) ).toVar(), moonUp = vec3( cross( sunDirection, moonSide ) ).toVar();
		const moon = vec2( dot( d, moonSide ), dot( d, moonUp ) ).toVar();
		const moonRadius = float( .019 ).toVar();
		const moonEdge = float( sub( 1., smoothstep( moonRadius.sub( .0007 ), moonRadius.add( .0007 ), length( moon ) ) ) ).toVar();
		const facing = float( step( .99, disc ) ).toVar(), halfLight = float( smoothstep( - .00035, .00035, moon.x ) ).toVar();
		col.addAssign( uSun.mul( pow( max( 0., disc ), 420. ) ).mul( .035 ).mul( visibleNight ) );
		col.assign( mix( col, uSun.mul( add( .87, mul( .06, sin( moon.y.mul( 1200. ) ) ).mul( sin( moon.x.mul( 950. ) ) ) ) ), moonEdge.mul( halfLight ).mul( facing ).mul( visibleNight ) ) );
		col.assign( mix( col, uHorizon, uMist.mul( sub( 1., smoothstep( .02, .40, h ) ) ).mul( .44 ) ) );

		return vec4( max( col, vec3( 0. ) ), 1. );

	} );
	return { hashSky, wrapGradient, paintedPanorama, paintedClouds, paintedAurora, skyFragment };

}