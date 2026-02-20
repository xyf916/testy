import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';

export interface FRPreview {
    title: string;
    status: string;
    content: string;
    filePath: string;
}

export interface FRContent {
    title: string;
    status: string;
    content: string;
    headings: string[];
    filePath: string;
    html: string;
}

export class FRDocumentService {
    private cache: Map<string, FRPreview> = new Map();
    private fullCache: Map<string, FRContent> = new Map();
    private pythonScriptPath: string;

    constructor(private context: vscode.ExtensionContext) {
        this.pythonScriptPath = path.join(context.extensionPath, 'python', 'fr_processor.py');
    }

    private getFRFolderPath(): string {
        const config = vscode.workspace.getConfiguration('frDetector');
        const configuredPath = config.get<string>('frFolderPath', '');

        if (configuredPath) {
            return configuredPath;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return path.join(workspaceFolders[0].uri.fsPath, 'FR');
        }

        return '';
    }

    private getPythonPath(): string {
        const config = vscode.workspace.getConfiguration('frDetector');
        return config.get<string>('pythonPath', 'python');
    }

    private async executePythonScript(args: string[]): Promise<string> {
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
                } else {
                    reject(new Error(stderr || `Python script exited with code ${code}`));
                }
            });

            process.on('error', (err) => {
                reject(err);
            });
        });
    }

    async getFRPreview(frNumber: string): Promise<FRPreview | null> {
        if (this.cache.has(frNumber)) {
            return this.cache.get(frNumber)!;
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

            const preview = JSON.parse(result) as FRPreview;

            if (preview && preview.content) {
                this.cache.set(frNumber, preview);
                return preview;
            }

            return null;
        } catch (error) {
            //console.error(`Error getting FR preview: ${error}`);
            throw error;
        }
    }

    async getFRContent(frNumber: string): Promise<FRContent | null> {
        if (this.fullCache.has(frNumber)) {
            return this.fullCache.get(frNumber)!;
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

            const content = JSON.parse(result) as FRContent;

            if (content && content.content) {
                this.fullCache.set(frNumber, content);
                return content;
            }

            return null;
        } catch (error) {
            //console.error(`Error getting FR content: ${error}`);
            throw error;
        }
    }

    clearCache(): void {
        this.cache.clear();
        this.fullCache.clear();
    }

    dispose(): void {
        this.clearCache();
    }
}
