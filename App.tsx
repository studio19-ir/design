
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

const Loader: React.FC = () => (
    <div className="flex items-center justify-center space-x-2">
        <div className="w-4 h-4 rounded-full animate-pulse bg-red-500"></div>
        <div className="w-4 h-4 rounded-full animate-pulse bg-red-500" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 rounded-full animate-pulse bg-red-500" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

const FileInput: React.FC<{
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selectedFile: File | null;
    id: string;
    label: string;
    icon: React.ReactNode;
}> = ({ onChange, selectedFile, id, label, icon }) => (
    <div>
        <label htmlFor={id} className="w-full cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg inline-flex items-center justify-center transition duration-300">
            {icon}
            <span>{label}</span>
        </label>
        <input id={id} type="file" className="hidden" accept="image/*" onChange={onChange} />
        {selectedFile && <p className="text-gray-400 mt-2 text-sm text-center truncate">Selected: {selectedFile.name}</p>}
    </div>
);


const App: React.FC = () => {
    // Post State
    const [title, setTitle] = useState<string>('لغو طرح شارژرهای برقی در پمپ بنزین‌ها؛\nاختلاف در شورای شهر ونکوور بالا گرفت');
    const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
    const [logoImage, setLogoImage] = useState<File | null>(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fontSize, setFontSize] = useState<number>(90);
    const [textAlign, setTextAlign] = useState<'right' | 'center' | 'left'>('right');
    const [lineHeight, setLineHeight] = useState<number>(1.2);
    const [textVerticalPosition, setTextVerticalPosition] = useState<number>(60);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Hashtag State
    const [caption, setCaption] = useState<string>('');
    const [isHashtagLoading, setIsHashtagLoading] = useState<boolean>(false);
    const [hashtagError, setHashtagError] = useState<string | null>(null);
    const [copyButtonText, setCopyButtonText] = useState<string>('Copy');

    // Story State
    const [isStoryLoading, setIsStoryLoading] = useState<boolean>(false);
    const [storyError, setStoryError] = useState<string | null>(null);
    const [storyFontSize, setStoryFontSize] = useState<number>(48);
    const [storyTextAlign, setStoryTextAlign] = useState<'right' | 'center' | 'left'>('right');
    const [storyLineHeight, setStoryLineHeight] = useState<number>(1.4);
    const [storyTextVerticalPosition, setStoryTextVerticalPosition] = useState<number>(80);
    const storyCanvasRef = useRef<HTMLCanvasElement | null>(null);


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBackgroundImage(e.target.files[0]);
            setGeneratedImageUrl(null);
            setError(null);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoImage(e.target.files[0]);
            setGeneratedImageUrl(null);
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value);
        setGeneratedImageUrl(null);
    }
    
    const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = src;
        });
    }, []);

    const wrapText = useCallback((
        context: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeightValue: number
    ) => {
        const lines = text.split('\n');
        let currentY = y;
        
        context.textBaseline = 'top';

        lines.forEach(lineText => {
            const words = lineText.split(' ');
            let line = '';
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line.trim(), x, currentY);
                    line = words[n] + ' ';
                    currentY += lineHeightValue;
                } else {
                    line = testLine;
                }
            }
            context.fillText(line.trim(), x, currentY);
            currentY += lineHeightValue;
        });
    }, []);

    const drawCanvas = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const CANVAS_WIDTH = 1080;
        const CANVAS_HEIGHT = 1080;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        if (!backgroundImage) {
            ctx.fillStyle = '#1F2937';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = '#9CA3AF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '30px sans-serif';
            ctx.fillText('Select a background image to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            return;
        }

        await document.fonts.load(`700 ${fontSize}px Vazirmatn`);

        const bgUrl = URL.createObjectURL(backgroundImage);
        const bgImg = await loadImage(bgUrl);

        const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
        const imageAspect = bgImg.width / bgImg.height;
        let sx, sy, sWidth, sHeight;

        if (imageAspect > canvasAspect) {
            sHeight = bgImg.height;
            sWidth = sHeight * canvasAspect;
            sx = (bgImg.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = bgImg.width;
            sHeight = sWidth / canvasAspect;
            sx = 0;
            sy = (bgImg.height - sHeight) / 2;
        }
        ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        URL.revokeObjectURL(bgUrl);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(0.65, 'rgba(200, 0, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(204, 0, 0, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';

        ctx.font = '700 32px Vazirmatn';
        ctx.textAlign = 'left';
        ctx.fillText('www.payamjavan.com', 50, 60);
        
        ctx.font = '700 24px Vazirmatn';
        ctx.fillText('مجله فارسی ایرانیان آمریکا و کانادا', 50, 110);
        
        if (logoImage) {
            const logoUrl = URL.createObjectURL(logoImage);
            try {
                const logoImg = await loadImage(logoUrl);
                ctx.drawImage(logoImg, CANVAS_WIDTH - 134, 40, 84, 84);
            } catch (e) {
                console.error("Error loading logo image:", e);
            } finally {
                URL.revokeObjectURL(logoUrl);
            }
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `700 ${fontSize}px Vazirmatn`;
        ctx.textAlign = textAlign;
        ctx.direction = 'rtl';

        let x;
        if (textAlign === 'right') {
            x = CANVAS_WIDTH - 60;
        } else if (textAlign === 'left') {
            x = 60;
        } else {
            x = CANVAS_WIDTH / 2;
        }
        
        const finalLineHeight = fontSize * lineHeight;
        const totalLines = title.split('\n').reduce((acc, line) => acc + Math.ceil(ctx.measureText(line).width / (CANVAS_WIDTH - 120)), 0) + (title.split('\n').length - 1);
        const textHeight = totalLines * finalLineHeight;
        const startY = CANVAS_HEIGHT - textHeight - textVerticalPosition;
        
        wrapText(ctx, title, x, startY, CANVAS_WIDTH - 120, finalLineHeight);

    }, [backgroundImage, logoImage, title, fontSize, textAlign, lineHeight, textVerticalPosition, loadImage, wrapText]);

    const drawStoryCanvas = useCallback(async () => {
        const canvas = storyCanvasRef.current;
        if (!canvas || !backgroundImage || !generatedImageUrl || !caption.trim()) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const CANVAS_WIDTH = 1080;
        const CANVAS_HEIGHT = 1920;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        // 1. Draw blurred background
        const bgUrl = URL.createObjectURL(backgroundImage);
        const bgImg = await loadImage(bgUrl);
        
        const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT; // 9/16
        const imageAspect = bgImg.width / bgImg.height;
        let sx, sy, sWidth, sHeight;

        if (imageAspect > canvasAspect) {
            sHeight = bgImg.height;
            sWidth = sHeight * canvasAspect;
            sx = (bgImg.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = bgImg.width;
            sHeight = sWidth / canvasAspect;
            sx = 0;
            sy = (bgImg.height - sHeight) / 2;
        }

        ctx.filter = 'blur(15px)';
        ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.filter = 'none';
        URL.revokeObjectURL(bgUrl);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // 2. Draw the generated post image
        const postImg = await loadImage(generatedImageUrl);
        const postSize = CANVAS_WIDTH * 0.85;
        const postX = (CANVAS_WIDTH - postSize) / 2;
        const postY = 150;
        ctx.drawImage(postImg, postX, postY, postSize, postSize);

        // 3. Draw the caption text
        await document.fonts.load(`700 ${storyFontSize}px Vazirmatn`);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `700 ${storyFontSize}px Vazirmatn`;
        ctx.textAlign = storyTextAlign;
        ctx.direction = 'rtl';

        let textX;
        if (storyTextAlign === 'right') {
            textX = CANVAS_WIDTH - 60;
        } else if (storyTextAlign === 'left') {
            textX = 60;
        } else {
            textX = CANVAS_WIDTH / 2;
        }
        
        const firstParagraph = caption.split('\n\n')[0];
        const finalLineHeight = storyFontSize * storyLineHeight;
        const startY = postY + postSize + storyTextVerticalPosition;
        
        wrapText(ctx, firstParagraph, textX, startY, CANVAS_WIDTH - 120, finalLineHeight);

    }, [backgroundImage, generatedImageUrl, caption, storyFontSize, storyLineHeight, storyTextAlign, storyTextVerticalPosition, loadImage, wrapText]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    useEffect(() => {
        if (generatedImageUrl) {
            drawStoryCanvas();
        }
    }, [drawStoryCanvas, generatedImageUrl]);

    const handleGenerateClick = useCallback(async () => {
        if (!backgroundImage || !title.trim()) {
            setError('Please provide both a title and a background image.');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            await drawCanvas();
            const canvas = canvasRef.current;
            if (!canvas) throw new Error('Canvas not found');

            const finalImageUrl = canvas.toDataURL('image/jpeg', 0.9);
            setGeneratedImageUrl(finalImageUrl);
        } catch (err) {
            console.error(err);
            setError('An error occurred while generating the image.');
        } finally {
            setIsLoading(false);
        }
    }, [backgroundImage, title, drawCanvas]);

    const handleGenerateHashtags = async () => {
        if (!caption.trim()) {
            setHashtagError('Please enter a caption first.');
            return;
        }
        setIsHashtagLoading(true);
        setHashtagError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `بر اساس کپشن اینستاگرام زیر، ۷ هشتگ مرتبط به زبان فارسی تولید کن. فقط کلمات هشتگ را با فاصله از هم جدا کن و از علامت # استفاده نکن. کپشن: "${caption}"`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const hashtagsText = response.text;
            if (!hashtagsText) {
                throw new Error("Received empty response from API.");
            }
            
            const hashtags = hashtagsText.split(' ').filter(h => h).map(h => `#${h.trim()}`).join(' ');
            
            const captionWithoutOldHashtags = caption.split('\n\n#')[0];
            setCaption(`${captionWithoutOldHashtags.trim()}\n\n${hashtags}`);

        } catch (err) {
            console.error("Error generating hashtags:", err);
            setHashtagError('Failed to generate hashtags. Please try again.');
        } finally {
            setIsHashtagLoading(false);
        }
    };

    const handleCopyCaption = () => {
        if (!caption) return;
        navigator.clipboard.writeText(caption).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy'), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    const handleDownloadStory = async () => {
        setIsStoryLoading(true);
        setStoryError(null);
        try {
            await drawStoryCanvas();
            const canvas = storyCanvasRef.current;
            if (!canvas) throw new Error('Story canvas not found');
            const url = canvas.toDataURL('image/jpeg', 0.9);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'payamjavan-story.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

        } catch (err) {
            console.error("Error downloading story:", err);
            setStoryError('Failed to prepare story for download.');
        } finally {
            setIsStoryLoading(false);
        }
    };
    
    useEffect(() => {
        if (caption) {
            setHashtagError(null);
        }
    }, [caption]);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-4 bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-red-500">Instagram Post Generator</h1>
                        <p className="text-gray-400 mt-2">Create your post based on the template</p>
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300">Post Title (Farsi)</label>
                        <textarea
                            id="title"
                            rows={4}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-300 dir-rtl text-right"
                            value={title}
                            onChange={handleTitleChange}
                            placeholder="متن تایتل را اینجا وارد کنید"
                            style={{ direction: 'rtl' }}
                        />
                    </div>

                    <FileInput 
                        onChange={handleImageChange} 
                        selectedFile={backgroundImage} 
                        id="file-upload"
                        label="Choose Background Image"
                        icon={<svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>}
                    />

                    <div className="space-y-2">
                        {!logoImage ? (
                            <FileInput 
                                onChange={handleLogoChange} 
                                selectedFile={logoImage} 
                                id="logo-upload"
                                label="Upload Logo"
                                icon={<svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                            />
                        ) : (
                            <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                                <p className="text-gray-300 truncate">Logo: {logoImage.name}</p>
                                <button
                                    onClick={() => { setLogoImage(null); setGeneratedImageUrl(null); }}
                                    className="text-red-400 hover:text-red-300"
                                    aria-label="Remove logo"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>

                     <div className="space-y-2 border-t border-gray-700 pt-6">
                        <label htmlFor="caption" className="block text-sm font-medium text-gray-300">Caption & Hashtags</label>
                        <textarea
                            id="caption"
                            rows={6}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition duration-300 dir-rtl text-right"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="کپشن خود را اینجا وارد کنید تا هشتگ‌ها تولید شوند..."
                            style={{ direction: 'rtl' }}
                        />
                        {hashtagError && <p className="text-red-400 text-sm text-center">{hashtagError}</p>}
                        <div className="flex space-x-2 rtl:space-x-reverse">
                            <button
                                onClick={handleGenerateHashtags}
                                disabled={isHashtagLoading || !caption.trim()}
                                className="flex-grow bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                            >
                                {isHashtagLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Generate Hashtags'
                                )}
                            </button>
                            <button
                                onClick={handleCopyCaption}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!caption.trim()}
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                {copyButtonText}
                            </button>
                        </div>
                    </div>

                     {error && <p className="text-red-400 text-center py-4">{error}</p>}
                    
                    <button
                        onClick={handleGenerateClick}
                        disabled={isLoading || !backgroundImage || !title.trim()}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center mt-auto"
                    >
                        {isLoading ? <Loader /> : 'Generate Image'}
                    </button>
                </div>

                {/* Right Panel: Preview & Controls */}
                <div className="lg:col-span-8 flex flex-col md:flex-row gap-4">
                    <div className="flex-grow bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col justify-center items-center">
                        <h2 className="text-xl font-bold mb-4 text-center">Live Preview</h2>
                        <div className="w-full max-w-lg mx-auto aspect-square bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
                           <canvas ref={canvasRef} className="w-full h-full object-contain" />
                        </div>
                        {generatedImageUrl && (
                             <a
                                href={generatedImageUrl}
                                download="payamjavan-post.jpg"
                                className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 inline-flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download Image
                            </a>
                        )}
                    </div>

                    <div className="w-full md:w-32 bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col space-y-6 items-center justify-center flex-shrink-0">
                        <div className="w-full">
                            <label htmlFor="font-size" className="block text-sm text-center font-medium text-gray-300 mb-2">
                                Font Size <span className="font-bold text-red-400 block">{fontSize}px</span>
                            </label>
                            <input
                                id="font-size"
                                type="range"
                                min="40"
                                max="150"
                                value={fontSize}
                                onChange={(e) => {
                                  setFontSize(Number(e.target.value));
                                  setGeneratedImageUrl(null);
                                }}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                        </div>
                         <div className="w-full">
                            <label htmlFor="line-height" className="block text-sm text-center font-medium text-gray-300 mb-2">
                                Line Height <span className="font-bold text-red-400 block">{lineHeight.toFixed(1)}x</span>
                            </label>
                            <input
                                id="line-height"
                                type="range"
                                min="0.8"
                                max="2.0"
                                step="0.1"
                                value={lineHeight}
                                onChange={(e) => {
                                  setLineHeight(Number(e.target.value));
                                  setGeneratedImageUrl(null);
                                }}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                        </div>
                        <div className="w-full">
                            <label htmlFor="vertical-position" className="block text-sm text-center font-medium text-gray-300 mb-2">
                                Vertical Pos <span className="font-bold text-red-400 block">{textVerticalPosition}px</span>
                            </label>
                            <input
                                id="vertical-position"
                                type="range"
                                min="20"
                                max="400"
                                value={textVerticalPosition}
                                onChange={(e) => {
                                    setTextVerticalPosition(Number(e.target.value));
                                    setGeneratedImageUrl(null);
                                }}
                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                            />
                        </div>
                        <div className="w-full">
                            <label className="block text-sm text-center font-medium text-gray-300 mb-2">Alignment</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => { setTextAlign('left'); setGeneratedImageUrl(null); }} className={`p-2 rounded-lg transition flex justify-center items-center ${textAlign === 'left' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} aria-label="Align left">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM2 9a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1zm0 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                </button>
                                <button onClick={() => { setTextAlign('center'); setGeneratedImageUrl(null); }} className={`p-2 rounded-lg transition flex justify-center items-center ${textAlign === 'center' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} aria-label="Align center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM2 9a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1zm3 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                </button>
                                <button onClick={() => { setTextAlign('right'); setGeneratedImageUrl(null); }} className={`p-2 rounded-lg transition flex justify-center items-center ${textAlign === 'right' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} aria-label="Align right">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM6 9a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zm-4 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* <!-- New Story Generator Section --> */}
            <div className="max-w-7xl mx-auto mt-12 border-t border-gray-700 pt-8 w-full">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-red-500">Instagram Story Generator</h2>
                    <p className="text-gray-400 mt-2">Create a story from your generated post</p>
                </div>

                {!generatedImageUrl ? (
                    <div className="text-center bg-gray-800 p-8 rounded-2xl">
                        <p className="text-lg text-gray-400">Please generate a post above to create a story.</p>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Story Preview */}
                        <div className="flex-grow bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col justify-center items-center">
                            <h3 className="text-xl font-bold mb-4 text-center">Story Preview</h3>
                            <div className="w-full max-w-sm mx-auto aspect-[9/16] bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
                                <canvas ref={storyCanvasRef} className="w-full h-full object-contain" />
                            </div>
                             {storyError && <p className="text-red-400 text-center py-4 mt-2">{storyError}</p>}
                            <button
                                onClick={handleDownloadStory}
                                disabled={isStoryLoading || !caption.trim()}
                                className="w-full max-w-sm mt-6 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                            >
                                {isStoryLoading ? <Loader /> : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                        Download Story
                                    </>
                                )}
                            </button>
                        </div>
                        {/* Story Controls */}
                        <div className="w-full lg:w-48 bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col space-y-6 justify-center flex-shrink-0">
                            <p className="text-gray-300 text-center">Adjust the appearance of the caption text in your story.</p>
                            
                            <div className="w-full">
                                <label htmlFor="story-font-size" className="block text-sm text-center font-medium text-gray-300 mb-2">
                                    Font Size <span className="font-bold text-red-400 block">{storyFontSize}px</span>
                                </label>
                                <input id="story-font-size" type="range" min="20" max="100" value={storyFontSize} onChange={(e) => setStoryFontSize(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500" />
                            </div>

                             <div className="w-full">
                                <label htmlFor="story-line-height" className="block text-sm text-center font-medium text-gray-300 mb-2">
                                    Line Height <span className="font-bold text-red-400 block">{storyLineHeight.toFixed(1)}x</span>
                                </label>
                                <input id="story-line-height" type="range" min="0.8" max="2.5" step="0.1" value={storyLineHeight} onChange={(e) => setStoryLineHeight(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500" />
                            </div>

                            <div className="w-full">
                                <label htmlFor="story-vertical-position" className="block text-sm text-center font-medium text-gray-300 mb-2">
                                    Vertical Pos <span className="font-bold text-red-400 block">{storyTextVerticalPosition}px</span>
                                </label>
                                <input id="story-vertical-position" type="range" min="20" max="200" value={storyTextVerticalPosition} onChange={(e) => setStoryTextVerticalPosition(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-red-500" />
                            </div>

                            <div className="w-full">
                                <label className="block text-sm text-center font-medium text-gray-300 mb-2">Alignment</label>
                                <div className="grid grid-cols-3 gap-2">
                                     <button onClick={() => setStoryTextAlign('left')} className={`p-2 rounded-lg transition flex justify-center items-center ${storyTextAlign === 'left' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} aria-label="Align left">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM2 9a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1zm0 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button onClick={() => setStoryTextAlign('center')} className={`p-2 rounded-lg transition flex justify-center items-center ${storyTextAlign === 'center' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} aria-label="Align center">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM2 9a1 1 0 011-1h10a1 1 0 110 2H3a1 1 0 01-1-1zm3 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button onClick={() => setStoryTextAlign('right')} className={`p-2 rounded-lg transition flex justify-center items-center ${storyTextAlign === 'right' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} aria-label="Align right">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 4a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM6 9a1 1 0 011-1h10a1 1 0 110 2H7a1 1 0 01-1-1zm-4 5a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default App;
