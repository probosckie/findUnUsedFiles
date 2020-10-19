// to construct a graph/hash of all necessary files needed by the app
import path from 'path';

import {
  getLines,
  detectEndOfImports,
  returnAbsolutelyAllFiles,
} from './utils';

import {
  allBasePaths,
  startingWithApiRegex,
  startOfRelativePath,
  goBackInRelativePath,
  createFileNamesCss,
  creatFileNameFromImplied,
  createFileNameFromRelative,
  isDefultExportPresentInFile,
  findAllNamedExportsFromAFile,
} from './codemod2';

const babelParser = require('@babel/parser');

const rootPathX = '--enter-root-path-to-your-project-here';

const rootPath = rootPathX + 'js'; //assuming there is a src/js folder and all the js/sss files are inside it

const allFiles = returnAbsolutelyAllFiles(rootPath);

//distinct extensions
let distinctFileTypes = {};
function getExtension(file) {
  let fileExtension = file.indexOf('.');
  if (fileExtension !== -1) {
    return file.slice(fileExtension);
  }
  return '';
}

allFiles.forEach((file) => {
  let fileExtension = file.indexOf('.');
  if (fileExtension !== -1) {
    distinctFileTypes[file.slice(fileExtension)] = 1;
  }
});

//for all files - in case of imports - if the import path is not a valid path then it's a npm package (apart from api)
const fileWithImportExtensionHash = {
  '.js': 1,
  '.mdx': 1,
  '.test.js': 1,
  '.mock.js': 1,
};

const allFilesWithImport = allFiles.filter((file) => {
  const extension = getExtension(file);
  return extension in fileWithImportExtensionHash;
});

//for all files with imports - if some import path is not resolvable - then it's a npm package - let's create a hashmap of all these npm packages

let libraryPathsHash = {};

allFilesWithImport.forEach((file) => {
  const lines = getLines(file);
  const importEnd = detectEndOfImports(lines);
  if (importEnd > 0) {
    const importLines = lines.slice(0, importEnd);
    const importBlock = importLines.join('\n');
    //let restOfFile = lines.slice(importEnd);

    let ast = babelParser.parse(importBlock, { sourceType: 'module' });
    ast = ast.program.body;

    ast.forEach((importDeclaration) => {
      const importPath = importDeclaration.source.value;

      if (!isValidPathToAFile(importPath)) {
        libraryPathsHash[importPath] = 1;
      }
    });
  } else {
    //console.log('no import found for file: ', file);
  }
});

//creating a dependency graph of all possible files

const impliedPathsHash = {
  modules: rootPath + '/modules/',
  api: rootPath + '/api/',
  model: rootPath + '/model/',
  ui: rootPath + '/ui/',
  views: rootPath + '/views/',
  store: rootPath + '/store.js',
};

const apiOrStoreHash = {
  api: rootPath + '/api/api.js',
  store: rootPath + '/store.js',
};

const dynamicImportTest = /import\(/;
const dynamicImportStartAndEnd = /import\((.*)\)/;
const dynamicImportArr = [];

function findFilesWithDynamicImports(files) {
  const fileArrayWithDynamicImport = {};
  const filesWithDynImports = files.filter((file) => {
    const extension = getExtension(file);
    if (extension === '.js') {
      const lines = getLines(file);
      const importEnd = detectEndOfImports(lines);
      const importLines = lines.slice(importEnd);
      for (let i = 0; i < importLines.length; i++) {
        let line = importLines[i];
        if (dynamicImportTest.test(line)) {
          fileArrayWithDynamicImport[file] = {
            start: importEnd + i,
            line,
          };
          return true;
        }
      }
    }
    return false;
  });

  filesWithDynImports.filter((file) => {
    const line = fileArrayWithDynamicImport[file];
    if (dynamicImportStartAndEnd.test(line.line)) {
      let matchTest = line.line.match(dynamicImportStartAndEnd);
      if (matchTest && matchTest[0]) {
        let ast = babelParser.parse(matchTest[0], { sourceType: 'module' });
        ast = ast.program.body;
        let importValue = ast[0].expression.arguments[0].value;
        if (!libraryPathsHash[importValue]) {
          dynamicImportArr.push({
            file,
            importPath: importValue,
          });
        }
      }
    }
  });
}

findFilesWithDynamicImports(allFiles);

function isValidPathToAFile(importPath) {
  if (
    allBasePaths.test(importPath) ||
    startingWithApiRegex.test(importPath) ||
    startOfRelativePath.test(importPath) ||
    goBackInRelativePath.test(importPath)
  ) {
    return true;
  }
  return false;
}

function isCssFilePath(importPath) {
  return path.extname(importPath) === '.sss';
}

function createFilePathName(importPath, currentFilePath) {
  //if it's api or store
  if (importPath === 'api' || importPath === 'store') {
    return apiOrStoreHash[importPath];
  }
  if (allBasePaths.test(importPath)) {
    let possibleName = creatFileNameFromImplied(importPath);
    return possibleName;
  }
  if (startOfRelativePath.test(importPath)) {
    let possibleName = createFileNameFromRelative(currentFilePath, importPath);
    return possibleName;
  }
  console.log('no files found for case: ', importPath, currentFilePath);
  return false;
}

function findImportsAst(file) {
  const lines = getLines(file);
  const importEnd = detectEndOfImports(lines);
  if (importEnd > 0) {
    const importLines = lines.slice(0, importEnd);
    const importBlock = importLines.join('\n');
    let ast = babelParser.parse(importBlock, { sourceType: 'module' });
    ast = ast.program.body;
    return ast;
  }
  return false;
}

let dependencyGraph = {};

let testPath = rootPath + '/app.js';

function findDependenciesFromRoot(rootFilePath) {
  if (rootFilePath) {
    let importAst = findImportsAst(rootFilePath);
    let importAnalyzeSeed = {};
    if (importAst) {
      importAst.forEach((importDeclaration) => {
        const importPath = importDeclaration.source.value;
        if (isCssFilePath(importPath)) {
          const directory = path.dirname(rootFilePath);
          let possibleName;

          if (allBasePaths.test(importPath)) {
            possibleName = createFileNamesCss(importPath);
          } else {
            possibleName = path.join(directory, importPath);
          }
          dependencyGraph[possibleName] = 1;
        } else if (isValidPathToAFile(importPath)) {
          let finalPath = createFilePathName(importPath, rootFilePath);
          if (finalPath && !(finalPath in dependencyGraph)) {
            dependencyGraph[finalPath] = {};
            importAnalyzeSeed[finalPath] = 1;
          }
          let specifiers = importDeclaration.specifiers;
          if (specifiers && specifiers.length) {
            specifiers.forEach((specifier) => {
              if (specifier.type === 'ImportDefaultSpecifier') {
                dependencyGraph[finalPath].default = 1;
              } else {
                dependencyGraph[finalPath][specifier.local.name] = 1;
              }
            });
          }
        }
      });
    }
    let isThereExtraStuffToExplore = Object.keys(importAnalyzeSeed);
    if (isThereExtraStuffToExplore.length) {
      isThereExtraStuffToExplore.forEach((file) =>
        findDependenciesFromRoot(file),
      );
    }
  }
}

findDependenciesFromRoot(testPath);

//adding test files to the list of dependencies
const testFileExtensions = { '.mdx': 1, '.test.js': 1, '.mock.js': 1 };
const testFiles = allFiles.filter((file) => {
  const extension = getExtension(file);
  return extension in testFileExtensions;
});

testFiles.forEach((file) => {
  findDependenciesFromRoot(file);
});

//adding dynamic imports to list of dependencies
dynamicImportArr.forEach((element) => {
  let fp = createFilePathName(element.importPath, element.file);
  if (fp) {
    findDependenciesFromRoot(fp);
  }
});

//creating a similar graph of all the js/sss files in the system - and doing the subtraction

const jsAndCssExtension = {
  '.js': 1,
  '.sss': 1,
};

const allJsSssFiles = allFiles.filter((file) => {
  const extension = getExtension(file);
  return extension in jsAndCssExtension;
});

const allFilesHash = {};

allJsSssFiles.forEach((file) => {
  const extension = getExtension(file);
  if (extension === '.sss') {
    allFilesHash[file] = 1;
  } else {
    allFilesHash[file] = {};
    const isDefault = isDefultExportPresentInFile(file);
    if (isDefault) {
      allFilesHash[file].default = 1;
    }
    const namedExports = findAllNamedExportsFromAFile(file);
    if (namedExports.length) {
      namedExports.forEach(
        (namedExport) => (allFilesHash[file][namedExport] = 1),
      );
    }
  }
});

const unusedFiles = {};

function compareExport(allFileExports, necessaryExport) {
  let diff = {};

  for (let ex in allFileExports) {
    if (!(ex in necessaryExport)) {
      diff[ex] = 1;
    }
  }

  return diff;
}

for (let file in allFilesHash) {
  const extension = getExtension(file);
  if (extension === '.sss') {
    if (!(file in dependencyGraph)) {
      unusedFiles[file] = 1;
    }
  } else {
    if (!(file in dependencyGraph)) {
      unusedFiles[file] = 1;
    } else {
      let compareExports = compareExport(
        allFilesHash[file],
        dependencyGraph[file],
      );

      if (Object.keys(compareExports).length) {
        unusedFiles[file] = compareExports;
      }
    }
  }
}

console.log(unusedFiles);
