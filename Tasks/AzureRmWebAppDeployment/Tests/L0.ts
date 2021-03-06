import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'vsts-task-lib/mock-test';
import tl = require('vsts-task-lib');
var ltx = require('ltx');
import fs = require('fs');

describe('AzureRmWebAppDeployment Suite', function() {
     before((done) => {
        tl.cp(path.join(__dirname, 'L1XmlVarSub/Web.config'), path.join(__dirname, 'L1XmlVarSub/Web_test.config'), null, false);
        tl.cp(path.join(__dirname, 'L1XmlVarSub/Web.Debug.config'), path.join(__dirname, 'L1XmlVarSub/Web_test.Debug.config'), null, false);
        tl.cp(path.join(__dirname, 'L0XdtTransform/Web.config'), path.join(__dirname, 'L0XdtTransform/Web_test.config'), null, false);
        done();
    });
    after(function() {
        tl.rmRF(path.join(__dirname, 'L1XmlVarSub/Web_test.config'));
        tl.rmRF(path.join(__dirname, 'L1XmlVarSub/Web_test.Debug.config'));
        tl.rmRF(path.join(__dirname, 'L0XdtTransform/Web_test.config'), true);
    });

    if(tl.osType().match(/^Win/)) {
        it('Runs successfully with default inputs', (done:MochaDone) => {
            let tp = path.join(__dirname, 'L0WindowsDefault.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            assert(tr.invokedToolCount == 2, 'should have invoked tool twice');
            assert(tr.stderr.length == 0 || tr.errorIssues.length, 'should not have written to stderr');
            var expectedOut = 'Updated history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            assert(tr.succeeded, 'task should have succeeded');
            done();
        });

        it('Verify logs pushed to Kudu when task runs successfully with default inputs and env variables found', (done) => {
            this.timeout(1000);
            let tp = path.join(__dirname, 'L0WindowsDefault.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();

            var expectedOut = 'Updated history to kudu'; 
            var expectedMessage = JSON.stringify({
                type : 'Deployment',
                commitId : '46da24f35850f455185b9188b4742359b537076f',
                buildId : '1',
                releaseId : '1',
                buildNumber : '1',
                releaseName : 'Release-1',
                repoProvider : 'TfsGit',
                repoName : 'MyFirstProject',
                collectionUrl : 'https://abc.visualstudio.com/',
                teamProject : 'MyFirstProject',
                slotName : 'Production'
            });
            var expectedRequestBody = JSON.stringify({
                active : true,
                status : 4,
                status_text : 'success', 
                message : expectedMessage,
                author : 'author',
                deployer : 'VSTS',
                details : 'https://abc.visualstudio.com/MyFirstProject/_apps/hub/ms.vss-releaseManagement-web.hub-explorer?releaseId=1&_a=release-summary'
            });
            expectedRequestBody = 'kudu log requestBody is:' + expectedRequestBody;
            assert(tr.invokedToolCount == 2, 'should have invoked tool twice');
            assert(tr.stderr.length == 0 && tr.errorIssues.length == 0, 'should not have written to stderr');
            assert(tr.succeeded, 'task should have succeeded');
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            assert(tr.stdout.indexOf(expectedRequestBody) != -1, 'should have said: ' + expectedRequestBody);
            done();
        });

        it('Runs successfully with all other inputs', (done) => {
            let tp = path.join(__dirname, 'L0WindowsAllInput.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            var expectedOut = 'Updated history to kudu'; 
            assert(tr.invokedToolCount == 2, 'should have invoked tool twice');
            assert(tr.stderr.length == 0 && tr.errorIssues.length == 0, 'should not have written to stderr');
            assert(tr.stdout.search(expectedOut) >= 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            assert(tr.succeeded, 'task should have succeeded');
            done();
        });

        it('Runs successfully with default inputs for deployment to specific slot', (done) => {
            let tp = path.join(__dirname, 'L0WindowsSpecificSlot.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            var expectedOut = 'Updated history to kudu';
            assert(tr.invokedToolCount == 2, 'should have invoked tool twice');
            assert(tr.stderr.length == 0  && tr.errorIssues.length == 0, 'should not have written to stderr');
            assert(tr.stdout.search(expectedOut) >= 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            assert(tr.succeeded, 'task should have succeeded');
            done();
        });

        it('Fails if msdeploy cmd fails to execute', (done) => {
            let tp = path.join(__dirname, 'L0WindowsFailDefault.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            var expectedErr = 'Error: Error: msdeploy failed with return code: 1';
            var expectedOut = 'Failed to update history to kudu';
            assert(tr.invokedToolCount == 2, 'should have invoked tool once');
            assert(tr.errorIssues.length > 0 || tr.stderr.length > 0, 'should have written to stderr');
            assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'E should have said: ' + expectedErr); 
            assert(tr.stdout.search(expectedOut) >= 0, 'should have said: ' + expectedOut);
            var sampleOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
            assert(tr.failed, 'task should have failed');
            done();
        });

        it('Verify logs pushed to kudu when task fails if msdeploy cmd fails to execute and some env variables not found', (done) => {
            this.timeout(1000);
            let tp = path.join(__dirname, 'L0WindowsFailDefault.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            var expectedErr = 'Error: Error: msdeploy failed with return code: 1';
            var expectedOut = 'Failed to update history to kudu';
            var expectedMessage = JSON.stringify({
                type: "Deployment",
                commitId : '46da24f35850f455185b9188b4742359b537076f',
                buildId : '1',
                releaseId : '1',
                buildNumber : '1',
                releaseName : 'Release-1',
                repoProvider : 'TfsGit',
                repoName : 'MyFirstProject',
                collectionUrl : 'https://abc.visualstudio.com/',
                teamProject : 'MyFirstProject',
                slotName : 'Production'
            });
            var expectedRequestBody = JSON.stringify({
                active : false,
                status : 3,
                status_text : 'failed', 
                message : expectedMessage,
                author : 'author',
                deployer : 'VSTS',
                details : 'https://abc.visualstudio.com/MyFirstProject/_apps/hub/ms.vss-releaseManagement-web.hub-explorer?releaseId=1&_a=release-summary'
            });

            assert(tr.invokedToolCount == 2, 'should have invoked tool once');
            assert(tr.errorIssues.length > 0 || tr.stderr.length > 0, 'should have written to stderr');
            
            assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'should have said: ' + expectedErr);
            assert(tr.stdout.search(expectedOut) >= 0, 'should have said: ' + expectedOut);
            assert(tr.failed, 'task should have failed');
            expectedRequestBody = 'kudu log requestBody is:' + expectedRequestBody;
            assert(tr.stdout.indexOf(expectedRequestBody) != -1, 'should have said: ' + expectedRequestBody);
            var sampleOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
            done();
        });

        it('Runs successfully with parameter file present in package', (done) => {
            let tp = path.join(__dirname, 'L0WindowsParamFileinPkg.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            var expectedOut = 'Updated history to kudu';
            assert(tr.invokedToolCount == 2, 'should have invoked tool twice');
            assert(tr.stderr.length == 0 && tr.errorIssues.length == 0, 'should not have written to stderr');
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            assert(tr.succeeded, 'task should have succeeded');
            done();

        });

        it('Runs successfully with parameter file present in package on non-windows', (done) => {
            let tp = path.join(__dirname, 'L0NonWindowsParamFileinPkg.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            var expectedOut = 'Deployed using KuduDeploy';
            assert(tr.invokedToolCount == 0, 'should not have invoked any tool');
            assert(tr.stderr.length == 0, 'should not have written to stderr');
            assert(tr.succeeded, 'task should have succeeded'); 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Updated history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            done();
        });

        it('Fails if parameters file provided by user is not present', (done) => {
            let tp = path.join(__dirname, 'L0WindowsFailSetParamFile.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();

            assert(tr.invokedToolCount == 0, 'should not have invoked tool');
            assert(tr.stderr.length > 0 || tr.errorIssues.length > 0, 'should have written to stderr');
            var expectedErr = 'Error: loc_mock_SetParamFilenotfound0 invalidparameterFile.xml'; 
            assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'should have said: ' + expectedErr);
            var expectedOut = 'Failed to update history to kudu';
            assert(tr.stdout.search(expectedOut) >= 0, 'should have said: ' + expectedOut);
            var sampleOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
            assert(tr.failed, 'task should have failed');
            done();
        });

        it('Runs successfully with Folder Deployment', (done) => {
            let tp = path.join(__dirname, 'L0WindowsFolderPkg.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            assert(tr.invokedToolCount == 1, 'should have invoked tool once');
            assert(tr.stderr.length == 0 && tr.errorIssues.length == 0, 'should not have written to stderr');
            assert(tr.succeeded, 'task should have succeeded');
            var expectedOut = 'Updated history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            done();
        });
        it('Runs successfully with XDT Transformation (L1)', (done:MochaDone) => {
            let tp = path.join(__dirname, 'L0XdtTransform.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();

            if(tl.osType().match(/^Win/)) {
                var resultFile = ltx.parse(fs.readFileSync(path.join(__dirname, 'L0XdtTransform', 'Web_test.config')));
                var expectFile = ltx.parse(fs.readFileSync(path.join(__dirname, 'L0XdtTransform','Web_Expected.config')));
                assert(ltx.equal(resultFile, expectFile) , 'Should Transform attributes on Web.config');
            }
            else {
                tl.warning('Cannot test XDT Transformation in Non Windows Agent');
            }
            done();
        });

        it('Runs Successfully with XDT Transformation (Mock)', (done) => {
            this.timeout(1000);
            let tp = path.join(__dirname, 'L0WindowsXdtTransformation.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();

            var expectedOut = 'Updated history to kudu';
            assert(tr.invokedToolCount == 3, 'should have invoked tool thrice');
            assert(tr.stderr.length == 0  && tr.errorIssues.length == 0, 'should not have written to stderr');
            assert(tr.stdout.search(expectedOut) >= 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            assert(tr.succeeded, 'task should have succeeded');
            done();
        });

        it('Fails if XDT Transformation throws error (Mock)', (done) => {
            let tp = path.join(__dirname, 'L0WindowsXdtTransformationFail.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();

            var expectedErr = "Error: loc_mock_XdtTransformationErrorWhileTransforming web.config web.Release.config";
            assert(tr.invokedToolCount == 1, 'should have invoked tool only once');
            assert(tr.stderr.length > 0 || tr.errorIssues.length > 0, 'should have written to stderr');
            assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'E should have said: ' + expectedErr);
            var expectedOut = 'Failed to update history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            var sampleOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
            assert(tr.failed, 'task should have failed');
            done();
        });
    }
    else {
        it('Runs KuduDeploy successfully with default inputs on non-windows agent', (done) => {
            let tp = path.join(__dirname, 'L0NonWindowsDefault.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            var expectedOut = 'Deployed using KuduDeploy'; 
            assert(tr.invokedToolCount == 0, 'should not have invoked any tool');
            assert(tr.stderr.length == 0 && tr.errorIssues.length == 0, 'should not have written to stderr');
            assert(tr.succeeded, 'task should have succeeded');
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Updated history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            done();
        });

        it('Runs KuduDeploy successfully with folder archiving on non-windows agent', (done) => {
            let tp = path.join(__dirname, 'L0NonWindowsFolderPkg.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();

            assert(tr.invokedToolCount == 0, 'should not have invoked any tool');
            assert(tr.stderr.length == 0 && tr.errorIssues.length == 0, 'should not have written to stderr');
            var expectedOut = 'Compressed folder '; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Deployed using KuduDeploy'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Updated history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            expectedOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            assert(tr.succeeded, 'task should have succeeded');
            done();
        });

        it('Fails KuduDeploy if parameter file is present in package', (done) => {
            let tp = path.join(__dirname, 'L0NonWindowsFailParamPkg.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            assert(tr.invokedToolCount == 0, 'should not have invoked any tool');
            assert(tr.stderr.length > 0 || tr.errorIssues.length > 0, 'should have written to stderr');
            var expectedErr = 'Error: Error: loc_mock_MSDeploygeneratedpackageareonlysupportedforWindowsplatform'
            assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'should have said: ' + expectedErr);  
            var expectedOut = 'Failed to update history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            var sampleOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
            assert(tr.failed, 'task should have failed');
            done();
        });

        it('Fails KuduDeploy if folder archiving fails', (done) => {
            let tp = path.join(__dirname, 'L0NonWindowsFailArchive.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();
            
            assert(tr.invokedToolCount == 0, 'should not have invoked any tool');
            assert(tr.stderr.length >  0 || tr.errorIssues.length > 0, 'should have written to stderr');
            var expectedErr = 'Error: Error: Folder Archiving Failed'; 
            assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'should have said: ' + expectedErr); 
            var expectedOut = 'Failed to update history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            var sampleOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
            assert(tr.failed, 'task should have failed');
            done();
        });

        it('Fails if XDT Transformation is run on non-windows platform', (done) => {
            let tp = path.join(__dirname, 'L0NonWindowsXdtTransformationFail.js');
            let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
            tr.run();

            var expectedErr = "Error: loc_mock_CannotPerformXdtTransformationOnNonWindowsPlatform";
            assert(tr.invokedToolCount == 0, 'should not have invoked tool any tool');
            assert(tr.stderr.length > 0 || tr.errorIssues.length > 0, 'should have written to stderr');
            assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'E should have said: ' + expectedErr);
            var expectedOut = 'Failed to update history to kudu'; 
            assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
            var sampleOut = 'Successfully updated scmType to VSTSRM';
            assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
            assert(tr.failed, 'task should have failed');
            done();
        });
    }
    
    it('Fails if more than one package matched with specified pattern', (done) => {
        let tp = path.join(__dirname, 'L0WindowsManyPackage.js');
        let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert(tr.invokedToolCount == 0, 'should not have invoked any tool');
        assert(tr.stderr.length > 0 || tr.errorIssues.length > 0, 'should have written to stderr');
        var expectedErr = 'Error: loc_mock_MorethanonepackagematchedwithspecifiedpatternPleaserestrainthesearchpattern'; 
        assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'should have said: ' + expectedErr); 
        var expectedOut = 'Failed to update history to kudu';
        assert(tr.stdout.search(expectedOut) >= 0, 'should have said: ' + expectedOut);
        var sampleOut = 'Successfully updated scmType to VSTSRM';
        assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
        assert(tr.failed, 'task should have failed');
        done();
    });

    it('Fails if package or folder name is invalid', (done) => {
        let tp = path.join(__dirname, 'L0WindowsNoPackage.js');
        let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert(tr.invokedToolCount == 0, 'should not have invoked any tool');
        assert(tr.stderr.length > 0 || tr.errorIssues.length > 0, 'should have written to stderr');
        var expectedErr = 'Error: loc_mock_Nopackagefoundwithspecifiedpattern'; 
        assert(tr.stdErrContained(expectedErr) || tr.createdErrorIssue(expectedErr), 'should have said: ' + expectedErr);
        var expectedOut = 'Failed to update history to kudu';
        assert(tr.stdout.search(expectedOut) >= 0, 'should have said: ' + expectedOut); 
        var sampleOut = 'Successfully updated scmType to VSTSRM';
        assert(tr.stdout.search(sampleOut) < 0, 'should not have updated scmType');
        assert(tr.failed, 'task should have failed');
        done();
    });

    it('Runs successfully with XML variable substitution', (done:MochaDone) => {
        let tp = path.join(__dirname, 'L0XmlVarSub.js');
        let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();
		
        var resultFile = ltx.parse(fs.readFileSync(path.join(__dirname, 'L1XmlVarSub/Web_test.config')));
        var expectFile = ltx.parse(fs.readFileSync(path.join(__dirname, 'L1XmlVarSub/Web_Expected.config')));
        assert(ltx.equal(resultFile, expectFile) , 'Should have substituted variables in Web.config file');

        var resultFile = ltx.parse(fs.readFileSync(path.join(__dirname, 'L1XmlVarSub/Web_test.Debug.config')));
        var expectFile = ltx.parse(fs.readFileSync(path.join(__dirname, 'L1XmlVarSub/Web_Expected.Debug.config')));
        assert(ltx.equal(resultFile, expectFile) , 'Should have substituted variables in Web.Debug.config file');
        var expectedOut = 'Updated history to kudu'; 
        assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
        expectedOut = 'Successfully updated scmType to VSTSRM';
        assert(tr.stdout.search(expectedOut) > 0, 'should have said: ' + expectedOut);
        done();
    });

    it('Runs successfully with JSON variable substitution', (done:MochaDone) => {
        let tp = path.join(__dirname, 'L0JsonVarSub.js');
        let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert(tr.stdout.search('JSON - eliminating object variables validated') > 0, 'JSON - eliminating object variables validation error');
        assert(tr.stdout.search('JSON - simple string change validated') > 0,'JSON -simple string change validation error' );
        assert(tr.stdout.search('JSON - system variable elimination validated') > 0, 'JSON -system variable elimination validation error');
        assert(tr.stdout.search('JSON - special variables validated') > 0, 'JSON - special variables validation error');
        assert(tr.stdout.search('JSON - varaibles with dot character validated') > 0, 'JSON varaibles with dot character validated');
        assert(tr.succeeded, 'task should have succeeded');
        done();
    });

    it('Validate File Encoding', (done:MochaDone) => {
        let tp = path.join(__dirname, 'L0ValidateFileEncoding.js');
        let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert(tr.stdout.search('UTF-8 with BOM validated') >= 0, 'Should have validated UTF-8 with BOM');
        assert(tr.stdout.search('UTF-16LE with BOM validated') >= 0, 'Should have validated UTF-16LE with BOM');
        assert(tr.stdout.search('UTF-16BE with BOM validated') >= 0, 'Should have validated UTF-16BE with BOM');
        assert(tr.stdout.search('UTF-32LE with BOM validated') >= 0, 'Should have validated UTF-32LE with BOM');
        assert(tr.stdout.search('UTF-32BE with BOM validated') >= 0, 'Should have validated UTF-32BE with BOM');

        assert(tr.stdout.search('UTF-8 without BOM validated') >= 0, 'Should have validated UTF-8 without BOM');
        assert(tr.stdout.search('UTF-16LE without BOM validated') >= 0, 'Should have validated UTF-16LE without BOM');
        assert(tr.stdout.search('UTF-16BE without BOM validated') >= 0, 'Should have validated UTF-16BE without BOM');
        assert(tr.stdout.search('UTF-32LE without BOM validated') >= 0, 'Should have validated UTF-32LE without BOM');
        assert(tr.stdout.search('UTF-32BE without BOM validated') >= 0, 'Should have validated UTF-32BE without BOM');

        assert(tr.stdout.search('Short File Buffer Error') >= 0, 'Should have validated short Buffer');
        assert(tr.stdout.search('Unknown encoding type') >= 0, 'Should throw for Unknown File Buffer');
        done();
    });
});
