import * as vscode from 'vscode';
import { FRHoverProvider } from './hoverProvider';
import { FRDocumentService } from './frDocumentService';
import { FRWebViewPanel } from './webviewPanel';

let frDocumentService: FRDocumentService;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    // console.log('FR Reference Detector is now active');

    // Initialize the document service
    frDocumentService = new FRDocumentService(context);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(file-text) FR Detector";
    statusBarItem.tooltip = "FR Reference Detector Active";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register hover provider for C++ and Ada files
    const cppSelector: vscode.DocumentSelector = [
        { language: 'cpp', scheme: 'file' },
        { language: 'c', scheme: 'file' }
    ];
    const adaSelector: vscode.DocumentSelector = [
        { language: 'ada', scheme: 'file' }
    ];

    const hoverProvider = new FRHoverProvider(frDocumentService);
    
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(cppSelector, hoverProvider),
        vscode.languages.registerHoverProvider(adaSelector, hoverProvider)
    );

    // Register command to open FR document
    const openFRCommand = vscode.commands.registerCommand('frDetector.openFR', async (frNumber: string) => {
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
                    FRWebViewPanel.createOrShow(context.extensionUri, frNumber, content);
                    statusBarItem.text = "$(file-text) FR Detector";
                } else {
                    vscode.window.showErrorMessage(`FR${frNumber} document not found`);
                    statusBarItem.text = "$(file-text) FR Detector";
                }
            } catch (error) {
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
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            updateStatusBar(editor);
        })
    );

    updateStatusBar(vscode.window.activeTextEditor);
}

function updateStatusBar(editor: vscode.TextEditor | undefined) {
    if (editor) {
        const langId = editor.document.languageId;
        if (langId === 'cpp' || langId === 'c' || langId === 'ada') {
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    } else {
        statusBarItem.hide();
    }
}

export function deactivate() {
    if (frDocumentService) {
        frDocumentService.dispose();
    }
}
