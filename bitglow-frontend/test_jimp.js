import { Jimp } from 'jimp';

async function main() {
    try {
        const image = await Jimp.read('public/bitglow.png');
        console.log('Image dimensions:', image.width, 'x', image.height);

        let minX = image.width, maxX = 0, minY = image.height, maxY = 0;
        
        image.scan(0, 0, image.width, image.height, function(x, y, idx) {
            const r = this.bitmap.data[idx];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            
            // Check if pixel is NOT black (threshold: brightness > 15)
            const isBlack = (r < 15 && g < 15 && b < 15);
            if (!isBlack) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        });
        
        console.log('Logo Bounding Box:');
        console.log('X:', minX, 'to', maxX, '(width:', maxX - minX + 1, ')');
        console.log('Y:', minY, 'to', maxY, '(height:', maxY - minY + 1, ')');

        // Let's print color of a pixel right in the middle of the logo (e.g. at the center)
        const centerX = Math.floor((minX + maxX) / 2);
        const centerY = Math.floor((minY + maxY) / 2);
        const c = image.getPixelColor(centerX, centerY);
        console.log('Center pixel hex:', c.toString(16));
        
        // Print R, G, B at center
        const idx = (centerY * image.width + centerX) * 4;
        console.log('Center pixel RGB:', image.bitmap.data[idx], image.bitmap.data[idx+1], image.bitmap.data[idx+2]);
    } catch (err) {
        console.error(err);
    }
}

main();
