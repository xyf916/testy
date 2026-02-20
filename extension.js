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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const hoverProvider_1 = require("./hoverProvider");
const frDocumentService_1 = require("./frDocumentService");
const webviewPanel_1 = require("./webviewPanel");
let frDocumentService;
let statusBarItem;
function activate(context) {
    // console.log('FR Reference Detector is now active');
    // Initialize the document service
    frDocumentService = new frDocumentService_1.FRDocumentService(context);
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(file-text) FR Detector";
    statusBarItem.tooltip = "FR Reference Detector Active";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Register hover provider for C++ and Ada files
    const cppSelector = [
        { language: 'cpp', scheme: 'file' },
        { language: 'c', scheme: 'file' }
    ];
    const adaSelector = [
        { language: 'ada', scheme: 'file' }
    ];
    const hoverProvider = new hoverProvider_1.FRHoverProvider(frDocumentService);
    context.subscriptions.push(vscode.languages.registerHoverProvider(cppSelector, hoverProvider), vscode.languages.registerHoverProvider(adaSelector, hoverProvider));
    // Register command to open FR document
    const openFRCommand = vscode.commands.registerCommand('frDetector.openFR', async (frNumber) => {
        if (!frNumber) {
            frNumber = await vscode.window.showInputBox({
                prompt: 'Enter FR number (e.g., FR222)',
                placeHolder: 'FR222'
            }) || '';
        }
        if (frNumber) {
            // Extract just the number if full FR reference provided
            const match = frNumber.match(/FR(\d+)/i);
            if (match) {
                frNumber = match[1];
            }
            try {
                statusBarItem.text = "$(sync~spin) Loading FR...";
                const content = await frDocumentService.getFRContent(frNumber);
                if (content) {
                    webviewPanel_1.FRWebViewPanel.createOrShow(context.extensionUri, frNumber, content);
                    statusBarItem.text = "$(file-text) FR Detector";
                }
                else {
                    vscode.window.showErrorMessage(`FR${frNumber} document not found`);
                    statusBarItem.text = "$(file-text) FR Detector";
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error loading FR${frNumber}: ${error}`);
                statusBarItem.text = "$(file-text) FR Detector";
            }
        }
    });
    // Register command to refresh cache
    const refreshCacheCommand = vscode.commands.registerCommand('frDetector.refreshCache', () => {
        frDocumentService.clearCache();
        vscode.window.showInformationMessage('FR Document cache cleared');
    });
    context.subscriptions.push(openFRCommand, refreshCacheCommand);
    // Update status bar on active editor change
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        updateStatusBar(editor);
    }));
    updateStatusBar(vscode.window.activeTextEditor);
}
function updateStatusBar(editor) {
    if (editor) {
        const langId = editor.document.languageId;
        if (langId === 'cpp' || langId === 'c' || langId === 'ada') {
            statusBarItem.show();
        }
        else {
            statusBarItem.hide();
        }
    }
    else {
        statusBarItem.hide();
    }
}
function deactivate() {
    if (frDocumentService) {
        frDocumentService.dispose();
    }
}
//# sourceMappingURL=extension.js.map