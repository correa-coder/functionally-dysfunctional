import fs from "fs";
import path from "path";

const BASE_DIR = path.join(process.cwd(), "public/assets/music");
const FILEPATH = path.join(BASE_DIR, "_fileList.json");

function createDirectory(dirPath) {
    try {
        fs.mkdirSync(dirPath);
        console.log(`Created directory: ${dirPath}`);
    } catch (error) {
        console.error(`Failed to create directory: ${dirPath}`);
    }
}

function createFile(baseDir, filePath) {
    try {
        const data = [];

        const files = fs.readdirSync(baseDir);

        files.forEach((file) => {
            if (!file.endsWith(".json")) {
                data.push(file);
            }
        });

        fs.writeFileSync(filePath, JSON.stringify(data));

        console.log(`Created file: ${filePath}`);
    } catch (error) {
        console.error(`Failed to create file: ${filePath}`);
    }
}

function main() {
    if (!fs.existsSync(BASE_DIR)) {
        createDirectory(BASE_DIR);
    }

    createFile(BASE_DIR, FILEPATH);
}

main();
