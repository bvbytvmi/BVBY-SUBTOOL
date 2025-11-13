import React, { useState, useRef, useEffect } from 'react';
import { Upload, Plus, Trash2, Eye, EyeOff, Layers, Brush, Eraser, Move, Undo, Redo, Square, Circle } from 'lucide-react';

const ImageEditor = () => {
  const [layers, setLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [tool, setTool] = useState('select');
  const [brushSize, setBrushSize] = useState(20);
  const [brushShape, setBrushShape] = useState('circle');
  const [maskColor, setMaskColor] = useState('rgba(255, 0, 0, 0.5)');
  const [feather, setFeather] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [draggedLayerIndex, setDraggedLayerIndex] = useState(null);
  const [isMovingImage, setIsMovingImage] = useState(false);
  const [moveStartPos, setMoveStartPos] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [editingLayerName, setEditingLayerName] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastPoint, setLastPoint] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [originalLayerData, setOriginalLayerData] = useState({});
  
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const layerFileInputRef = useRef(null);
  const canvasContainerRef = useRef(null);

  const maskColors = {
    black: 'rgba(0, 0, 0, 0.5)',
    green: 'rgba(0, 255, 0, 0.5)',
    white: 'rgba(255, 255, 255, 0.5)',
    red: 'rgba(255, 0, 0, 0.5)',
    blue: 'rgba(0, 0, 255, 0.5)',
    yellow: 'rgba(255, 255, 0, 0.5)'
  };

  useEffect(() => {
    renderCanvas();
  }, [layers, selectedLayer, zoom]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const saveHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    const layersClone = layers.map(layer => ({
      ...layer,
      image: layer.image,
      mask: layer.mask
    }));
    newHistory.push(layersClone);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setLayers([...history[historyIndex - 1]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setLayers([...history[historyIndex + 1]]);
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    layers.forEach((layer, index) => {
      if (layer.visible && layer.image) {
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        
        const x = layer.x || 0;
        const y = layer.y || 0;
        const width = layer.width || layer.image.width;
        const height = layer.height || layer.image.height;
        const rotation = layer.rotation || 0;
        
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(layer.image, -width / 2, -height / 2, width, height);
        
        ctx.restore();
        
        // 선택된 레이어에 바운딩 박스 표시
        if (tool === 'select' && index === selectedLayer) {
          ctx.save();
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.translate(x + width / 2, y + height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.strokeRect(-width / 2, -height / 2, width, height);
          
          // 핸들 그리기
          const handleSize = 8;
          ctx.fillStyle = '#3b82f6';
          // 코너 핸들
          ctx.fillRect(-width / 2 - handleSize / 2, -height / 2 - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(width / 2 - handleSize / 2, -height / 2 - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(-width / 2 - handleSize / 2, height / 2 - handleSize / 2, handleSize, handleSize);
          ctx.fillRect(width / 2 - handleSize / 2, height / 2 - handleSize / 2, handleSize, handleSize);
          
          // 회전 핸들
          ctx.beginPath();
          ctx.arc(0, -height / 2 - 20, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(0, -height / 2);
          ctx.lineTo(0, -height / 2 - 14);
          ctx.stroke();
          
          ctx.restore();
        }
      }
    });

    if (selectedLayer !== null && layers[selectedLayer]?.mask) {
      const maskCanvas = maskCanvasRef.current;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalAlpha = 1;
    }
  };

  const loadImage = (file, isBase = false) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          if (isBase) {
            setCanvasSize({ width: img.width, height: img.height });
            setTimeout(() => {
              const maskCanvas = maskCanvasRef.current;
              if (maskCanvas) {
                maskCanvas.width = img.width;
                maskCanvas.height = img.height;
              }
            }, 0);
          }
          resolve(img);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleBaseImageUpload = async (file) => {
    if (!file) return;
    try {
      const img = await loadImage(file, true);
      const newLayer = {
        id: Date.now(),
        name: '베이스 이미지',
        image: img,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
        rotation: 0
      };
      setLayers([newLayer]);
      setSelectedLayer(0);
      setHistory([[newLayer]]);
      setHistoryIndex(0);
    } catch (error) {
      console.error('로드 실패:', error);
    }
  };

  const handleAddLayer = async (file) => {
    if (!file) return;
    try {
      const img = await loadImage(file, false);
      const newLayer = {
        id: Date.now(),
        name: '레이어 ' + layers.length,
        image: img,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
        rotation: 0
      };
      const newLayers = [...layers, newLayer];
      setLayers(newLayers);
      setSelectedLayer(layers.length);
      saveHistory();
    } catch (error) {
      console.error('추가 실패:', error);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      if (layers.length === 0) {
        handleBaseImageUpload(files[0]);
      } else {
        handleAddLayer(files[0]);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDeleteLayer = (index) => {
    const newLayers = layers.filter((_, i) => i !== index);
    setLayers(newLayers);
    setSelectedLayer(newLayers.length > 0 ? 0 : null);
    saveHistory();
  };

  const toggleLayerVisibility = (index) => {
    const newLayers = [...layers];
    newLayers[index].visible = !newLayers[index].visible;
    setLayers(newLayers);
  };

  const handleOpacityChange = (index, value) => {
    const newLayers = [...layers];
    newLayers[index].opacity = value;
    setLayers(newLayers);
  };

  const handleLayerDragStart = (e, index) => {
    setIsDraggingLayer(true);
    setDraggedLayerIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e, index) => {
    e.preventDefault();
    if (draggedLayerIndex === null || draggedLayerIndex === index) return;
    
    const newLayers = [...layers];
    const draggedLayer = newLayers[draggedLayerIndex];
    newLayers.splice(draggedLayerIndex, 1);
    newLayers.splice(index, 0, draggedLayer);
    
    setLayers(newLayers);
    setDraggedLayerIndex(index);
    
    if (selectedLayer === draggedLayerIndex) {
      setSelectedLayer(index);
    }
  };

  const handleLayerDragEnd = () => {
    setIsDraggingLayer(false);
    setDraggedLayerIndex(null);
  };

  const startDrawing = (e) => {
    if (selectedLayer === null) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (tool === 'select') {
      const layer = layers[selectedLayer];
      const lx = layer.x || 0;
      const ly = layer.y || 0;
      const lw = layer.width || layer.image.width;
      const lh = layer.height || layer.image.height;
      const rotation = (layer.rotation || 0) * Math.PI / 180;
      
      // 회전 핸들 체크
      const centerX = lx + lw / 2;
      const centerY = ly + lh / 2;
      const rotateHandleX = centerX + Math.sin(rotation) * (lh / 2 + 20);
      const rotateHandleY = centerY - Math.cos(rotation) * (lh / 2 + 20);
      const distToRotate = Math.sqrt((x - rotateHandleX) ** 2 + (y - rotateHandleY) ** 2);
      
      if (distToRotate < 10) {
        setIsRotating(true);
        return;
      }
      
      // 리사이즈 핸들 체크 (간단히 코너만)
      const corners = [
        { x: lx, y: ly, handle: 'tl' },
        { x: lx + lw, y: ly, handle: 'tr' },
        { x: lx, y: ly + lh, handle: 'bl' },
        { x: lx + lw, y: ly + lh, handle: 'br' }
      ];
      
      for (const corner of corners) {
        const dist = Math.sqrt((x - corner.x) ** 2 + (y - corner.y) ** 2);
        if (dist < 10) {
          setIsResizing(true);
          setResizeHandle(corner.handle);
          setMoveStartPos({ x, y, startW: lw, startH: lh, startX: lx, startY: ly });
          return;
        }
      }
      
      // 이동
      setIsMovingImage(true);
      setMoveStartPos({ 
        x: x - lx, 
        y: y - ly
      });
      return;
    }
    
    setIsDrawing(true);
    setLastPoint({ x, y });
    drawOnMask(x, y);
  };

  const draw = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === 'select' && selectedLayer !== null) {
      const layer = layers[selectedLayer];
      const newLayers = [...layers];
      
      if (isRotating) {
        const centerX = (layer.x || 0) + (layer.width || layer.image.width) / 2;
        const centerY = (layer.y || 0) + (layer.height || layer.image.height) / 2;
        const angle = Math.atan2(x - centerX, centerY - y) * 180 / Math.PI;
        newLayers[selectedLayer].rotation = angle;
        setLayers(newLayers);
        return;
      }
      
      if (isResizing) {
        const dx = x - moveStartPos.x;
        const dy = y - moveStartPos.y;
        
        if (resizeHandle === 'br') {
          newLayers[selectedLayer].width = Math.max(10, moveStartPos.startW + dx);
          newLayers[selectedLayer].height = Math.max(10, moveStartPos.startH + dy);
        } else if (resizeHandle === 'tr') {
          newLayers[selectedLayer].width = Math.max(10, moveStartPos.startW + dx);
          newLayers[selectedLayer].height = Math.max(10, moveStartPos.startH - dy);
          newLayers[selectedLayer].y = moveStartPos.startY + dy;
        } else if (resizeHandle === 'bl') {
          newLayers[selectedLayer].width = Math.max(10, moveStartPos.startW - dx);
          newLayers[selectedLayer].height = Math.max(10, moveStartPos.startH + dy);
          newLayers[selectedLayer].x = moveStartPos.startX + dx;
        } else if (resizeHandle === 'tl') {
          newLayers[selectedLayer].width = Math.max(10, moveStartPos.startW - dx);
          newLayers[selectedLayer].height = Math.max(10, moveStartPos.startH - dy);
          newLayers[selectedLayer].x = moveStartPos.startX + dx;
          newLayers[selectedLayer].y = moveStartPos.startY + dy;
        }
        
        setLayers(newLayers);
        return;
      }
      
      if (isMovingImage) {
        newLayers[selectedLayer].x = x - moveStartPos.x;
        newLayers[selectedLayer].y = y - moveStartPos.y;
        setLayers(newLayers);
        return;
      }
    }

    if (!isDrawing || selectedLayer === null) return;
    
    if (lastPoint) {
      const dist = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
      const steps = Math.max(1, Math.floor(dist / 2));
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = lastPoint.x + (x - lastPoint.x) * t;
        const py = lastPoint.y + (y - lastPoint.y) * t;
        drawOnMask(px, py);
      }
    }
    setLastPoint({ x, y });
  };

  const drawOnMask = (x, y) => {
    const maskCanvas = maskCanvasRef.current;
    const ctx = maskCanvas.getContext('2d');
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      
      if (feather > 0) {
        // Feather: 중심은 100%, 가장자리로 갈수록 페이드
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushSize / 2);
        const baseColor = maskColor.replace(/[\d.]+\)$/, '1)');
        const fadeStart = 1 - (feather / 10);
        
        gradient.addColorStop(0, baseColor); // 중심 100%
        gradient.addColorStop(fadeStart, baseColor); // fadeStart까지 100% 유지
        gradient.addColorStop(1, maskColor.replace(/[\d.]+\)$/, '0)')); // 가장자리 0%
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = maskColor;
      }
    }
    
    if (brushShape === 'circle') {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      if (feather > 0 && tool !== 'eraser') {
        // 사각형에도 feather 적용
        const halfSize = brushSize / 2;
        for (let dx = -halfSize; dx <= halfSize; dx++) {
          for (let dy = -halfSize; dy <= halfSize; dy++) {
            const distFromCenter = Math.max(Math.abs(dx), Math.abs(dy));
            const distFromEdge = halfSize - distFromCenter;
            const fadeRange = (feather / 10) * halfSize;
            
            let alpha = 1;
            if (distFromEdge < fadeRange) {
              alpha = distFromEdge / fadeRange;
            }
            
            ctx.fillStyle = maskColor.replace(/[\d.]+\)$/, alpha + ')');
            ctx.fillRect(x + dx, y + dy, 1, 1);
          }
        }
      } else {
        ctx.fillRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
      }
    }
    
    ctx.globalCompositeOperation = 'source-over';
    renderCanvas();
  };

  const stopDrawing = () => {
    if (isDrawing && tool !== 'select') {
      saveHistory();
    }
    if (isMovingImage || isResizing || isRotating) {
      saveHistory();
    }
    setIsDrawing(false);
    setIsMovingImage(false);
    setIsResizing(false);
    setIsRotating(false);
    setResizeHandle(null);
    setLastPoint(null);
  };

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    const ctx = maskCanvas.getContext('2d');
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    renderCanvas();
    saveHistory();
  };

  return (
    <div 
      className="w-full h-screen bg-gray-900 text-white flex flex-col"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <h1 className="text-xl font-bold">이미지 편집 모드</h1>
        <div className="flex gap-2">
          <button 
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-30"
          >
            <Undo size={20} />
          </button>
          <button 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-30"
          >
            <Redo size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers size={20} />
              레이어
            </h2>
            <button
              onClick={() => layerFileInputRef.current?.click()}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              <Plus size={16} />
            </button>
          </div>

          {layers.length === 0 ? (
            <div className="text-center py-8">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 mx-auto"
              >
                <Upload size={16} />
                이미지 업로드
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleLayerDragStart(e, index)}
                  onDragOver={(e) => handleLayerDragOver(e, index)}
                  onDragEnd={handleLayerDragEnd}
                  className={'p-3 rounded cursor-move transition ' + (selectedLayer === index ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600') + (isDraggingLayer && draggedLayerIndex === index ? ' opacity-50' : '')}
                  onClick={() => setSelectedLayer(index)}
                >
                  <div className="flex items-center justify-between mb-2">
                    {editingLayerName === index ? (
                      <input
                        type="text"
                        value={layer.name}
                        onChange={(e) => {
                          const newLayers = [...layers];
                          newLayers[index].name = e.target.value;
                          setLayers(newLayers);
                        }}
                        onBlur={() => setEditingLayerName(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingLayerName(null)}
                        className="bg-gray-600 px-2 py-1 rounded text-sm flex-1"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        className="font-medium"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingLayerName(index);
                        }}
                      >
                        {layer.name}
                      </span>
                    )}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerVisibility(index);
                        }}
                        className="p-1 hover:bg-gray-500 rounded"
                      >
                        {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLayer(index);
                        }}
                        className="p-1 hover:bg-red-600 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-300">투명도</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={layer.opacity}
                      onChange={(e) => handleOpacityChange(index, parseFloat(e.target.value))}
                      className="flex-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-300 w-8">
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files[0] && handleBaseImageUpload(e.target.files[0])}
            className="hidden"
          />
          <input
            ref={layerFileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files[0] && handleAddLayer(e.target.files[0])}
            className="hidden"
          />
        </div>

        <div 
          ref={canvasContainerRef}
          className="flex-1 bg-gray-900 flex items-center justify-center p-4 overflow-auto relative"
        >
          <div style={{ transform: 'scale(' + zoom + ')' }}>
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className={'border-2 border-gray-600 rounded ' + (tool === 'select' ? 'cursor-move' : 'cursor-crosshair')}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <canvas
                ref={maskCanvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="absolute top-0 left-0 pointer-events-none"
              />
            </div>
          </div>
          <div className="absolute bottom-4 right-4 bg-gray-800 px-3 py-1 rounded text-sm">
            Zoom: {Math.round(zoom * 100)}% (Ctrl+Wheel)
          </div>
        </div>

        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">도구</h2>

          <div className="bg-gray-700 rounded p-4 mb-4">
            <button
              onClick={() => setTool('select')}
              className={'w-full py-2 px-3 rounded flex items-center justify-center gap-2 mb-3 ' + (tool === 'select' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500')}
            >
              <Move size={16} />
              선택 도구 (이동)
            </button>

            <h3 className="font-semibold mb-3 border-t border-gray-600 pt-3">마스크</h3>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setTool('brush')}
                  className={'flex-1 py-2 px-3 rounded flex items-center justify-center gap-2 ' + (tool === 'brush' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500')}
                >
                  <Brush size={16} />
                  브러시
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  className={'flex-1 py-2 px-3 rounded flex items-center justify-center gap-2 ' + (tool === 'eraser' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500')}
                >
                  <Eraser size={16} />
                  지우개
                </button>
              </div>

              <div>
                <label className="block text-sm mb-2">브러시 모양</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBrushShape('circle')}
                    className={'flex-1 py-2 rounded flex items-center justify-center ' + (brushShape === 'circle' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500')}
                  >
                    <Circle size={16} />
                  </button>
                  <button
                    onClick={() => setBrushShape('square')}
                    className={'flex-1 py-2 rounded flex items-center justify-center ' + (brushShape === 'square' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500')}
                  >
                    <Square size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">색상</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(maskColors).map(([name, color]) => (
                    <button
                      key={name}
                      onClick={() => setMaskColor(color)}
                      className={'h-8 rounded border-2 ' + (maskColor === color ? 'border-white' : 'border-gray-600')}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">크기: {brushSize}px</label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Feather: {feather}/10</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={feather}
                  onChange={(e) => setFeather(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={clearMask}
                className="w-full py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                마스크 초기화
              </button>
            </div>
          </div>

          <div className="bg-gray-700 rounded p-4 mb-4">
            <h3 className="font-semibold mb-3">AI 편집</h3>
            <div className="space-y-2">
              <button className="w-full py-2 bg-gray-600 rounded opacity-50">
                🪄 원클릭 자동 합성
              </button>
              <button className="w-full py-2 bg-gray-600 rounded opacity-50">
                ✂️ 마스크 부분 편집
              </button>
              <button className="w-full py-2 bg-gray-600 rounded opacity-50">
                🎨 마스크 부분 합성
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Phase 2에서 구현 예정</p>
          </div>

          <div className="bg-gray-700 rounded p-4">
            <h3 className="font-semibold mb-3">이미지 향상</h3>
            <div className="space-y-2">
              <button className="w-full py-2 bg-gray-600 rounded opacity-50">
                🔍 업스케일 2x
              </button>
              <button className="w-full py-2 bg-gray-600 rounded opacity-50">
                🔍 업스케일 4x
              </button>
              <button className="w-full py-2 bg-gray-600 rounded opacity-50">
                😊 얼굴 복원
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Phase 3에서 구현 예정</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
