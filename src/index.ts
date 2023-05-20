import * as fs from 'fs';
import * as readline from 'readline';

// Функция для разбиения файла на части и сортировки каждой части
async function sortFile(filename: string, maxMemory: number) {
  const chunkSize = Math.floor(maxMemory / 2); // Размер части файла, которую мы можем обработать за один проход
  const tempFiles: string[] = []; // Массив временных файлов
  let tempFileNum = 0; // Номер текущего временного файла

  // Открываем исходный файл для чтения
  const readStream = fs.createReadStream(filename, { encoding: 'utf8' });

  // Создаем интерфейс для чтения потока построчно
  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  // Создаем массив для хранения строк текущей части файла
  let chunk: string[] = [];

  // Обработчик для чтения строк из потока
  for await (const line of rl) {
    chunk.push(line);

    // Если размер текущей части файла превысил максимальный размер части, то сортируем ее и записываем во временный файл
    if (chunk.join('\n').length > chunkSize) {
      chunk.sort();
      const tempFilename = `temp_${tempFileNum}.txt`;
      tempFiles.push(tempFilename);
      await fs.promises.writeFile(tempFilename, chunk.join('\n'));
      chunk = [];
      tempFileNum++;
    }
  }

  // Если в конце файла осталась неполная часть, то сортируем и записываем ее во временный файл
  if (chunk.length > 0) {
    chunk.sort();
    const tempFilename = `temp_${tempFileNum}.txt`;
    tempFiles.push(tempFilename);
    await fs.promises.writeFile(tempFilename, chunk.join('\n'));
  }

  // Закрываем чтение исходного файла
  readStream.close();

  // Функция для чтения строк из временных файлов
  async function* readTempFiles() {
    for (const tempFile of tempFiles) {
      const readStream = fs.createReadStream(tempFile, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity,
      });
      for await (const line of rl) {
        yield line;
      }
      readStream.close();
    }
  }

  // Сортируем строки из всех временных файлов и записываем их в исходный файл
  const writeStream = fs.createWriteStream(filename);
  const lines = [];
  for await (const line of readTempFiles()) {
    lines.push(line);
  }
  lines.sort();
  lines.forEach((line) => {
    writeStream.write(line + "\n");
  });

  writeStream.close();

  // Удаляем все временные файлы
  for (const tempFile of tempFiles) {
    await fs.promises.unlink(tempFile);
  }
  console.log(`Файл ${filename} успешно отсортирован!`);
}

// Сортируем файл
sortFile('test.txt', 500 * 1024 * 1024); // Максимальный размер памяти - 500 мегабайт
