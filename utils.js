import fs from 'fs';


export function getLines(filePath) {
  let fileText = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
  let fileLines = fileText.split('\n');
  return fileLines;
}

//import based regexes
export const importEndOnSameLineRegex = /^import(.*);$/;
const importEndOnDifferentLineRegex = /^import(.*){$/;


//returns the line at which the imports end
export function detectEndOfImports(lines) {
  let namedImportBlock = false;
  let i;
  for (i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (importEndOnSameLineRegex.test(line)) continue;
    if (importEndOnDifferentLineRegex.test(line)) {
      namedImportBlock = true;
    }
    if (namedImportBlock) {
      if (endOfNamedImport.test(line)) {
        namedImportBlock = false;
      }
      continue;
    }
    if (line.trim().length === 0) {
      continue;
    }
    if (line.trim().length !== 0) {
      break;
    }
  }
  return i;
}

export const returnAbsolutelyAllFiles = (dir, filelist) => {
  var path = path || require('path');
  var fs = fs || require('fs'),
    files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = returnAbsolutelyAllFiles(path.join(dir, file), filelist);
    } else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};
