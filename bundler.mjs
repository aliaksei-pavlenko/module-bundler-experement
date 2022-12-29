import fs from 'fs';
import babylon from 'babylon';
import astTraverse from 'babel-traverse';
import babel from 'babel-core';

import _path from 'path';
const rootDirectory = _path.dirname(process.argv[1]);
const entryPointFilePath = './module-1.mjs';
const entryIdentifier = _path.join(rootDirectory,entryPointFilePath);

let keyValueStrings = [];

function run (absModulePath) {
    // read
    const fileContent = fs.readFileSync(absModulePath,'utf-8');
    // ast
    const ast = babylon.parse(fileContent,{sourceType:'module'});
    // traverse ast and find all paths
    const paths = [];
    astTraverse.default(ast,{
        ImportDeclaration: ({node}) => {
            let path = node.source.value;
            if(path.match(/^(\.\/|\/|\.\.\/)/)){
                path = _path.join(_path.dirname(absModulePath),path);
            }
            // replace relative path on absolute
            node.source.value = path; 
            paths.push(path);
        }
    });
    // change syntax
    const {code} = babel.transformFromAst(ast,null,{presets:['env']});
    const codeWithWrapper = `function (require,module,exports){${code}}`;
    // console.log(absModulePath);
    // console.log(codeWithWrapper);
    keyValueStrings.push(`"${absModulePath}":${codeWithWrapper}`);
    paths.forEach(el=>run(el));
    // repeat
}

run(entryIdentifier);

const finalFn = `(function(modules){
    function require(identifier){

        const moduleToBeExecuted = modules[identifier]

        const module = {
            exports: {}
        };
        function passToModule(identifier){
            return require(identifier)
        }

        moduleToBeExecuted(passToModule,module,module.exports);

        return module.exports
    }

    require("${entryIdentifier}");
})({${keyValueStrings.join()}})`

console.log(finalFn);
