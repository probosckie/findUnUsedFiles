import {
  getLines,
  searchWholeWord
} from './utils';


const exportDefaultFromBeginning = /^export default/;

const namedExportReg1 = /^export (const|let) (\w+)\s/;
const namedExportReg2 = /^export function (\w+)/;
//for this - split the match(",")
const namedExportReg3 = /^export \{ (.*) \}/;
const namedExportReg4 = /^export class (\w+)\s/;

//this is for a re-export
const namedExportReg5 = /^export (\w+) from/;
const namedExportReg6 = /^export function\* (\w+)/;

//need to find every named export until the end of this block:
const namedExportReg7 = /^export \{$/;
const endOfNamedExportReg7 = /^\};$/;
const wordBetweenParethesis = /^(\s+)(\w+),/;

const inlineCommentRegex = /^\/\//;

//these are all your base paths - like src/js/views or src/js/modules
export const allBasePaths = /^(api|model|modules|ui|views|store)\//;

export const startingWithApiRegex = /^(api|store)/;

export const startOfRelativePath = /^(.|..)\//;

export const goBackInRelativePath = /^(\.|\.\.)/;


const exportDefaultFromBeginning = /^export default/;

const rootPath = '--enter-the-path-to-your-project-here';

let basePath = rootPath + '/';

export const isAFileWhichExists = (filePath) =>
  fs.existsSync(filePath) && fs.lstatSync(filePath).isFile();
  
export const isAJavascriptFile = (fileName) => path.extname(fileName) === '.js';


export const createFileNamesCss = (importPath) => {
  const p = importPath.split('/');
  const name = p[p.length - 1];

  const op1 = basePath + importPath + '/' + name + '.sss';

  const op2 = basePath + importPath;

  if (isAFileWhichExists(op1)) {
    return op1;
  }

  if (isAFileWhichExists(op2)) {
    return op2;
  }

  return false;
};

export const creatFileNameFromImplied = (importPath) => {
  let fullPath = path.join(basePath, importPath);
  if (isAJavascriptFile(importPath)) {
    if (isAFileWhichExists(fullPath)) {
      return fullPath;
    } else {
      console.log(fullPath + '  doesnt exist');
    }
  }

  if (lastChar(fullPath) === '/') {
    let possibleName = fullPath.substring(0, fullPath.length - 1) + '.js';
    if (isAFileWhichExists(possibleName)) {
      return possibleName;
    }
  }

  if (isAFileWhichExists(fullPath + '.js')) {
    return fullPath + '.js';
  }

  let parsedPath = path.parse(fullPath);
  let name = parsedPath.base;
  let pathWithSameName = path.join(fullPath, name + '.js');
  let pathWithIndex = path.join(fullPath, 'index.js');

  if (isAFileWhichExists(pathWithIndex)) {
    return pathWithIndex;
  }
  if (isAFileWhichExists(pathWithSameName)) {
    return pathWithSameName;
  }

  console.log('no file found! ' + importPath);
};


export const createFileNameFromRelative = (filePath, importPath) => {
  const pathToCurrentFileDirectory = path.dirname(filePath);
  const joinedPath = path.join(pathToCurrentFileDirectory, importPath);
  if (isAJavascriptFile(joinedPath)) {
    if (isAFileWhichExists(joinedPath)) {
      return joinedPath;
    } else {
      console.log(joinedPath + ' doesnt exist - reference is wrong');
    }
  }
  if (lastChar(joinedPath) === '/') {
    let possibleName = joinedPath.substring(0, joinedPath.length - 1) + '.js';
    if (isAFileWhichExists(possibleName)) {
      return possibleName;
    }
  }

  if (isAFileWhichExists(joinedPath + '.js')) {
    return joinedPath + '.js';
  }

  let parsedPath = path.parse(joinedPath);
  let name = parsedPath.base;
  let pathWithSameName = path.join(joinedPath, name + '.js');
  let pathWithIndex = path.join(joinedPath, 'index.js');

  if (isAFileWhichExists(pathWithIndex)) {
    return pathWithIndex;
  }
  if (isAFileWhichExists(pathWithSameName)) {
    return pathWithSameName;
  }

  console.log('no file found! ' + filePath + ' ' + importPath);
};

export function isDefultExportPresentInFile(file) {
  const lines = getLines(file);
  for (let i = 0; i < lines.length; i++) {
    if (exportDefaultFromBeginning.test(lines[i])) {
      return true;
    }
  }
  return false;
}

export function findAllNamedExportsFromAFile(filePath) {
  const lines = getLines(filePath);
  let namedExportNames = [];
  let iter;
  for (iter = 0; iter < lines.length; iter++) {
    const line = lines[iter];

    if (searchWholeWord(line, 'export') && !inlineCommentRegex.test(line)) {
      if (!exportDefaultFromBeginning.test(line)) {
        if (namedExportReg1.test(line)) {
          namedExportNames.push(line.match(namedExportReg1)[2]);
          continue;
        }
        if (namedExportReg2.test(line)) {
          namedExportNames.push(line.match(namedExportReg2)[1]);
          continue;
        }
        if (namedExportReg3.test(line)) {
          namedExportNames = namedExportNames.concat(
            extractTrimmedExportNamesBetweenParenthesis(line),
          );
          continue;
        }
        if (namedExportReg4.test(line)) {
          namedExportNames.push(line.match(namedExportReg4)[1]);
          continue;
        }

        if (namedExportReg5.test(line)) {
          namedExportNames.push(line.match(namedExportReg5)[1]);
          continue;
        }

        if (namedExportReg6.test(line)) {
          namedExportNames.push(line.match(namedExportReg6)[1]);
          continue;
        }

        if (namedExportReg7.test(line)) {
          let innerIter = iter;
          while (endOfNamedExportReg7.test(lines[innerIter])) {
            ++innerIter;
            let test = lines[innerIter].match(wordBetweenParethesis);
            if (test && test[2]) {
              namedExportNames.push(test[2]);
            }
          }
          iter = innerIter + 1;
        }
      }
    }
  }

  return namedExportNames;
}





