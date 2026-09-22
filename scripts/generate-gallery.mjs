/* scripts/generate-gallery.mjs */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import exifr from 'exifr';
import sharp from 'sharp';

// --- 設定區 ---
const RAW_DIR = path.resolve('photos/raw');
const THUMB_DIR = path.resolve('photos/thumbs');
const OUTPUT_JSON = path.resolve('photos/data.json');

const THUMB_WIDTH = 600; // 建議縮圖寬度設大一點點 (例如 600)，在 Retina 螢幕上看比較清楚
const THUMB_QUALITY = 80;

// 將快門時間轉為分數
function formatExposureTime(time) {
    if (!time) return '';
    if (time >= 1) return `${time}s`;
    return `1/${Math.round(1 / time)}`;
}

async function generate() {
    console.log('📸 開始處理相簿 (含自動旋轉修正)...');

    // 1. 確保縮圖根目錄存在
    try {
        await fs.access(THUMB_DIR);
    } catch {
        await fs.mkdir(THUMB_DIR, { recursive: true });
    }

    // 2. 讀取 RAW 目錄下的所有「資料夾」
    const items = await fs.readdir(RAW_DIR, { withFileTypes: true });
    const albumDirs = items.filter(dirent => dirent.isDirectory());

    const galleryData = [];

    console.log(`📂 找到 ${albumDirs.length} 本相簿`);

    for (const dir of albumDirs) {
        const albumId = dir.name;
        const albumPath = path.join(RAW_DIR, albumId);
        const albumThumbPath = path.join(THUMB_DIR, albumId);

        console.log(`\n=== 處理相簿: ${albumId} ===`);

        // 建立該相簿的縮圖目錄
        try {
            await fs.access(albumThumbPath);
        } catch {
            await fs.mkdir(albumThumbPath, { recursive: true });
        }

        // 讀取相簿內的圖片
        const files = await fs.readdir(albumPath);
        const imageFiles = files.filter(file => /\.(?:jpg|jpeg|png|webp)$/i.test(file));

        const photos = [];

        for (const file of imageFiles) {
            const inputPath = path.join(albumPath, file);
            const thumbName = file.replace(/\.[^.]+$/, '.webp');
            const outputPath = path.join(albumThumbPath, thumbName);

            process.stdout.write(`  Processing: ${file} ... `);

            try {
                // 處理圖片 (包含旋轉修正)
                const image = sharp(inputPath);
                const metadata = await image.metadata();

                // 判斷是否需要交換寬高
                // EXIF Orientation >= 5 代表圖片帶有 90 或 270 度的旋轉標籤
                const isRotated = metadata.orientation >= 5;
                const visualWidth = isRotated ? metadata.height : metadata.width;
                const visualHeight = isRotated ? metadata.width : metadata.height;

                // 檢查縮圖是否已存在
                let fileExists = false;
                try {
                    await fs.access(outputPath);
                    fileExists = true;
                } catch { /* 沒有就是要產生 */ }

                if (!fileExists) {
                    await image
                        .rotate() // 依據 EXIF 轉正圖片
                        .resize(THUMB_WIDTH)
                        .webp({ quality: THUMB_QUALITY })
                        .toFile(outputPath);
                    process.stdout.write('✅ Generated\n');
                } else {
                    process.stdout.write('⏭️ Skipped\n');
                }

                // B. 讀取 EXIF
                const exif = await exifr.parse(inputPath, [
                    'Make',
                    'Model',
                    'ISO',
                    'FNumber',
                    'ExposureTime',
                    'FocalLength',
                    'LensModel',
                    'DateTimeOriginal'
                ]);

                photos.push({
                    filename: file,
                    src: `${albumId}/${file}`,
                    thumb: `${albumId}/${thumbName}`,
                    // 使用修正後的「視覺寬高」
                    width: visualWidth,
                    height: visualHeight,
                    date: exif?.DateTimeOriginal,
                    exif: {
                        camera: exif?.Model || '',
                        lens: exif?.LensModel || '',
                        iso: exif?.ISO ? `ISO ${exif.ISO}` : '',
                        aperture: exif?.FNumber ? `f/${exif.FNumber}` : '',
                        shutter: formatExposureTime(exif?.ExposureTime),
                        focalLength: exif?.FocalLength ? `${exif.FocalLength}mm` : ''
                    }
                });
            } catch (error) {
                console.error(`\n❌ Error: ${file}`, error);
            }
        }

        if (photos.length > 0) {
            photos.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

            const coverPhoto = photos[0];

            galleryData.push({
                id: albumId,
                title: albumId.replace(/_/g, ' '),
                cover: coverPhoto.thumb,
                width: coverPhoto.width,
                height: coverPhoto.height,
                count: photos.length,
                photos
            });
        }
    }

    galleryData.sort((a, b) => b.id.localeCompare(a.id));

    await fs.writeFile(OUTPUT_JSON, JSON.stringify(galleryData, null, 2));
    console.log(`\n🎉 全部完成！資料已寫入 ${OUTPUT_JSON}`);
}

generate();
