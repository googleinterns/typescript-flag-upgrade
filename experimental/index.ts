import {Project} from 'ts-morph';

const project = new Project({
  tsConfigFilePath: './test/test-app/tsconfig.json',
});

// ...lots of code here that manipulates, copies, moves, and deletes files...
console.log('test');

const sourceFiles = project.getSourceFiles();

console.log(sourceFiles);

// when you're all done, call this and it will save everything to the file system
// await project.save();
