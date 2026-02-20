"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FRDocumentService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const cp = __importStar(require("child_process"));
class FRDocumentService {
    constructor(context) {
        this.context = context;
        this.cache = new Map();
        this.fullCache = new Map();
        this.pythonScriptPath = path.join(context.extensionPath, 'python', 'fr_processor.py');
    }
    getFRFolderPath() {
        const config = vscode.workspace.getConfiguration('frDetector');
        const configuredPath = config.get('frFolderPath', '');
        if (configuredPath) {
            return configuredPath;
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return path.join(workspaceFolders[0].uri.fsPath, 'FR');
        }
        return '';
    }
    getPythonPath() {
        const config = vscode.workspace.getConfiguration('frDetector');
        return config.get('pythonPath', 'python');
    }
    async executePythonScript(args) {
        return new Promise((resolve, reject) => {
            const pythonPath = this.getPythonPath();
            const process = cp.spawn(pythonPath, [this.pythonScriptPath, ...args], {
                cwd: this.context.extensionPath
            });
            let stdout = '';
            let stderr = '';
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            process.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                }
                else {
                    reject(new Error(stderr || `Python script exited with code ${code}`));
                }
            });
            process.on('error', (err) => {
                reject(err);
            });
        });
    }
    async getFRPreview(frNumber) {
        if (this.cache.has(frNumber)) {
            return this.cache.get(frNumber);
        }
        const frFolderPath = this.getFRFolderPath();
        if (!frFolderPath) {
            throw new Error('FR folder path not configured');
        }
        try {
            const result = await this.executePythonScript([
                'preview',
                frNumber,
                frFolderPath
            ]);
            const preview = JSON.parse(result);
            if (preview && preview.content) {
                this.cache.set(frNumber, preview);
                return preview;
            }
            return null;
        }
        catch (error) {
            //console.error(`Error getting FR preview: ${error}`);
            throw error;
        }
    }
    async getFRContent(frNumber) {
        if (this.fullCache.has(frNumber)) {
            return this.fullCache.get(frNumber);
        }
        const frFolderPath = this.getFRFolderPath();
        if (!frFolderPath) {
            throw new Error('FR folder path not configured');
        }
        try {
            const result = await this.executePythonScript([
                'full',
                frNumber,
                frFolderPath
            ]);
            const content = JSON.parse(result);
            if (content && content.content) {
                this.fullCache.set(frNumber, content);
                return content;
            }
            return null;
        }
        catch (error) {
            //console.error(`Error getting FR content: ${error}`);
            throw error;
        }
    }
    clearCache() {
        this.cache.clear();
        this.fullCache.clear();
    }
    dispose() {
        this.clearCache();
    }
}
exports.FRDocumentService = FRDocumentService;
//# sourceMappingURL=frDocumentService.js.map