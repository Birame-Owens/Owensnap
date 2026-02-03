"""Test compression d'images"""
from app.services.image_compressor import ImageCompressor, QUALITY_TESTS
from PIL import Image
import base64
import io

print('\n🧪 TEST 2: Image Compression with Quality Control')

# Créer une image test
image = Image.new('RGB', (500, 500), color='red')
buffer = io.BytesIO()
image.save(buffer, format='JPEG', quality=95)
test_b64 = base64.b64encode(buffer.getvalue()).decode()
original_size = len(buffer.getvalue()) / 1024

print(f'Image test créée: {original_size:.1f} KB\n')

# Tester les presets
print('Presets de compression:')
for preset, config in QUALITY_TESTS.items():
    compressed_b64, stats = ImageCompressor.compress_base64(
        test_b64,
        quality=config['quality'],
        max_dimension=config['max_dim']
    )
    
    quality = config['quality']
    reduction = stats['compression_ratio_percent']
    size = stats['compressed_size_kb']
    
    print(f'  {preset:12s} | Q:{quality:2d}% | Reduction:{reduction:5.1f}% | Size:{size:6.2f}KB')

print('\n✅ Image Compression FONCTIONNEL')
