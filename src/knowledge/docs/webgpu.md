# WebGPU Knowledge Base

## Bind Groups & Layouts

### Common Error: bindGroupLayout mismatch
**Cause:** The bind group layout specified in the pipeline doesn't match the actual bind group.

**Fix Steps:**
1. Check `@binding(n)` in WGSL shader matches bind group entry binding
2. Check `@group(n)` matches the bind group index in `setBindGroup(n, ...)`
3. Verify buffer types match (uniform, storage, read-only-storage)

```wgsl
// Shader
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> data: array<f32>;
```

```typescript
// Pipeline layout must match
const bindGroupLayout = device.createBindGroupLayout({
    entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } }
    ]
});
```

## Buffer Alignment

### 16-byte Alignment for Uniforms
Uniform buffers require 16-byte alignment. Use padding if needed.

```wgsl
struct Uniforms {
    mvp: mat4x4<f32>,      // 64 bytes (aligned)
    time: f32,              // 4 bytes
    _padding: vec3<f32>,    // 12 bytes padding to reach 16
}
```

## Render Pipeline

### Vertex Attribute Mismatch
Ensure vertex buffer layout matches shader inputs.

```wgsl
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
}
```

```typescript
// Buffer layout must match
const vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: 32, // 3+3+2 floats = 8 * 4 bytes
    attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 1, offset: 12, format: 'float32x3' },
        { shaderLocation: 2, offset: 24, format: 'float32x2' }
    ]
};
```

## Compute Shaders

### Workgroup Size
Choose workgroup size based on GPU architecture. Common sizes:
- 64 for AMD
- 32 for NVIDIA (warp size)
- 256 for general

```wgsl
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    // ...
}
```
