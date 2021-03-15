// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.argv._


const PACKAGE_LOCK_FILE_NAME = 'package-lock.json';
const SHRINKWRAP_FILE_NAME = 'npm-shrinkwrap.json';
const fileUtil = require('../utils/file.util');
const commonLock = require('./common.lock');
const NpmOptions = require('./npm.options');

function treatFields(dependencies, npmOptions = new NpmOptions()) {
  if (npmOptions.replacePackageLockRegistry === true && npmOptions.registry === undefined) {
    throw Error('replacePackageLockRegistry flag defined but registry is undefined');
  }
  Object.keys(dependencies).forEach((prop) => {
    const dependency = dependencies[prop];
    if (typeof dependency === 'object'
      && npmOptions.replacePackageLockRegistry === true
      && npmOptions.registry !== undefined
      && dependency.resolved !== undefined) {
      dependency.resolved = commonLock.replaceHost(dependency.resolved, npmOptions.registry);
    } else {
      delete dependency.resolved;
    }
    if (npmOptions.skipIntegrity === false) {
      delete dependency.integrity;
    }
    if (dependency.dependencies) {
      treatFields(dependency.dependencies, npmOptions);
    }
  });
}

/**
 * In the npm case the resolved and integrity fields should be removed
 * @param {string} folderPath the path where the lock file is
 * @param {string} outputFolder the path where the lock should be saved
 * @param {string} fileName the lock file name
 */
function treatLockFields(folderPath, outputFolder, fileName, npmOptions) {
  fileUtil.checkOutputFolderExistance(outputFolder);
  const fs = require('fs');
  const filePath = `${folderPath}/${fileName}`;
  const output = `${outputFolder}/${fileName}`;
  if (fs.existsSync(filePath, 'utf8')) {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    treatFields(json.dependencies, npmOptions);
    if (json.packages !== undefined) {
      treatFields(json.packages, npmOptions);
    }
    fs.writeFileSync(output, JSON.stringify(json, null, 2));
    console.info(`${filePath} treated`);
    return true;
  }
  console.warn(`${filePath} does not exist`);
  return false;
}

function run(folderPath, outputFolder, npmOptions) {
  const pljResult = treatLockFields(folderPath, outputFolder, PACKAGE_LOCK_FILE_NAME, npmOptions);
  const swResult = treatLockFields(folderPath, outputFolder, SHRINKWRAP_FILE_NAME, npmOptions);
  return pljResult || swResult;
}

module.exports = run;
