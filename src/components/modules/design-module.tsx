'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette,
  Sparkles,
  Download,
  Trash2,
  Wand2,
  Image as ImageIconLucide,
  Layers,
  ZoomIn,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { useWorkspaceStore, type GeneratedImage } from '@/store/workspace-store'

const STYLE_PRESETS = [
  { label: 'Photoréaliste', emoji: '📷' },
  { label: 'Illustration', emoji: '🎨' },
  { label: 'Art numérique', emoji: '💻' },
  { label: '3D Render', emoji: '🧊' },
  { label: 'Minimaliste', emoji: '✨' },
  { label: 'Cinéma', emoji: '🎬' },
]

const SIZE_OPTIONS = [
  { label: '1:1', size: '1024x1024', description: '1024×1024' },
  { label: '16:9', size: '1440x720', description: '1440×720' },
  { label: '9:16', size: '768x1344', description: '768×1344' },
  { label: '4:3', size: '1344x768', description: '1344×768' },
]

const EXAMPLE_PROMPTS = [
  {
    text: 'Un chat astronaute flottant dans une nébuleuse colorée, style photoréaliste',
    tag: 'Sci-Fi',
  },
  {
    text: 'Paysage japonais de montagnes au coucher du soleil, style aquarelle traditionnelle',
    tag: 'Nature',
  },
  {
    text: 'Architecture futuriste cyberpunk avec néons et pluie, vue nocturne',
    tag: 'Architecture',
  },
  {
    text: 'Portrait stylisé d\'un phénix renaissant de flammes dorées, art numérique',
    tag: 'Fantasy',
  },
]

export default function DesignModule() {
  const [prompt, setPrompt] = useState('')
  const [activeStyle, setActiveStyle] = useState<string | null>(null)
  const [activeSize, setActiveSize] = useState('1024x1024')
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)
  const [progress, setProgress] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const generatedImages = useWorkspaceStore((s) => s.generatedImages)
  const isGeneratingImage = useWorkspaceStore((s) => s.isGeneratingImage)
  const setIsGeneratingImage = useWorkspaceStore((s) => s.setIsGeneratingImage)
  const addGeneratedImage = useWorkspaceStore((s) => s.addGeneratedImage)

  const hasImages = generatedImages.length > 0

  const generateImage = useCallback(
    async (imagePrompt: string, size: string) => {
      const trimmed = imagePrompt.trim()
      if (!trimmed) return

      setIsGeneratingImage(true)
      setProgress(0)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 500)

      try {
        const styleSuffix = activeStyle ? `, ${activeStyle} style` : ''
        const fullPrompt = trimmed + styleSuffix

        const res = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fullPrompt, size }),
        })
        const data = await res.json()
        if (data.success) {
          clearInterval(progressInterval)
          setProgress(100)
          addGeneratedImage({
            id: `img-${Date.now()}`,
            prompt: trimmed,
            size,
            dataUrl: `data:image/png;base64,${data.image}`,
            createdAt: new Date(),
          })
          setPrompt('')
          setTimeout(() => setProgress(0), 500)
        }
      } catch {
        // handle error silently
      } finally {
        clearInterval(progressInterval)
        setIsGeneratingImage(false)
      }
    },
    [activeStyle, setIsGeneratingImage, addGeneratedImage]
  )

  const handleSubmit = useCallback(() => {
    generateImage(prompt, activeSize)
  }, [prompt, activeSize, generateImage])

  const handleDeleteImage = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      // Remove from store by filtering
      const store = useWorkspaceStore.getState()
      const updated = generatedImages.filter((img) => img.id !== id)
      // We need a way to remove — let's use a direct set approach
      // Since store doesn't have removeGeneratedImage, we use setState
      useWorkspaceStore.setState({ generatedImages: updated })
      if (previewImage?.id === id) {
        setPreviewImage(null)
      }
    },
    [generatedImages, previewImage]
  )

  const handleDownload = useCallback(
    (image: GeneratedImage, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const link = document.createElement('a')
      link.href = image.dataUrl
      link.download = `ai-image-${image.id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    []
  )

  const handleExampleClick = useCallback(
    (example: (typeof EXAMPLE_PROMPTS)[0]) => {
      setPrompt(example.text)
      textareaRef.current?.focus()
    },
    []
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Panel: History */}
      <AnimatePresence>
        {hasImages && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden md:block w-72 shrink-0 border-r border-border/50 overflow-y-auto custom-scrollbar"
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Galerie</h3>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {generatedImages.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {generatedImages.map((image, i) => (
                  <motion.button
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setPreviewImage(image)}
                    className={`relative aspect-square rounded-lg overflow-hidden group transition-all cursor-pointer ${
                      previewImage?.id === image.id
                        ? 'ring-2 ring-primary'
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                  >
                    <img
                      src={image.dataUrl}
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-1 left-1 right-1">
                      <p className="text-[10px] text-white/80 truncate">
                        {image.prompt.slice(0, 20)}...
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="p-4 md:p-6 pb-0">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Design Studio</h2>
              <p className="text-xs text-muted-foreground">
                Créez des images avec l&apos;IA
              </p>
            </div>
          </div>

          {/* Prompt Area */}
          <div className="glass-strong rounded-2xl p-4 space-y-4 mb-5">
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Décrivez votre image..."
              className="min-h-[100px] resize-none bg-transparent border-0 focus-visible:ring-0 placeholder:text-muted-foreground/50 text-base"
              disabled={isGeneratingImage}
            />

            {/* Style Presets */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Style
              </p>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.label}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      setActiveStyle(
                        activeStyle === preset.label ? null : preset.label
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      activeStyle === preset.label
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'glass-subtle text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="text-xs">{preset.emoji}</span>
                    {preset.label}
                    {activeStyle === preset.label && (
                      <Check className="w-3 h-3 ml-0.5" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Taille
              </p>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.size}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setActiveSize(opt.size)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      activeSize === opt.size
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'glass-subtle text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span
                      className={`text-[10px] ${
                        activeSize === opt.size
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground/60'
                      }`}
                    >
                      {opt.description}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <AnimatePresence>
              {isGeneratingImage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: 'linear',
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-primary" />
                    </motion.div>
                    <span>Génération en cours...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate Button */}
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isGeneratingImage}
              size="lg"
              className="w-full rounded-xl gap-2 text-base py-6"
            >
              {isGeneratingImage ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: 'linear',
                    }}
                  >
                    <Wand2 className="w-5 h-5" />
                  </motion.div>
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Générer l&apos;image
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Gallery or Welcome */}
        <div className="flex-1 px-4 md:px-6 pb-6">
          <AnimatePresence mode="wait">
            {!hasImages && !isGeneratingImage ? (
              /* Welcome State */
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
                >
                  <Palette className="w-10 h-10 text-primary" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl md:text-3xl font-bold tracking-tight mb-3"
                >
                  Studio de Design IA
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground text-base md:text-lg mb-10 max-w-md"
                >
                  Transformez vos idées en images
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {EXAMPLE_PROMPTS.map((example) => (
                    <button
                      key={example.text}
                      onClick={() => handleExampleClick(example)}
                      className="glass-subtle rounded-xl p-4 text-left transition-all hover:shadow-md group cursor-pointer"
                    >
                      <Badge
                        variant="secondary"
                        className="text-[10px] mb-2"
                      >
                        {example.tag}
                      </Badge>
                      <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
                        {example.text}
                      </p>
                    </button>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              /* Gallery */
              <motion.div
                key="gallery"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <ImageIconLucide className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">
                    Images générées
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {generatedImages.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {generatedImages.map((image, i) => (
                    <motion.div
                      key={image.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      layout
                      className="glass-subtle rounded-xl overflow-hidden group module-card cursor-pointer"
                      onClick={() => setPreviewImage(image)}
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        <img
                          src={image.dataUrl}
                          alt={image.prompt}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-full w-10 h-10"
                            onClick={(e) => {
                              setPreviewImage(image)
                              e.stopPropagation()
                            }}
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-full w-10 h-10"
                            onClick={(e) => handleDownload(image, e)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="rounded-full w-10 h-10 hover:bg-destructive/90 hover:text-white"
                            onClick={(e) => handleDeleteImage(image.id, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Card Info */}
                      <div className="p-3 space-y-2">
                        <p className="text-sm line-clamp-2 leading-relaxed">
                          {image.prompt}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {image.size}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(image.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Image Preview Modal */}
        <AnimatePresence>
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
              onClick={() => setPreviewImage(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="glass rounded-2xl p-4 space-y-4">
                  {/* Image */}
                  <div className="relative rounded-xl overflow-hidden bg-black/20">
                    <img
                      src={previewImage.dataUrl}
                      alt={previewImage.prompt}
                      className="w-full h-auto max-h-[70vh] object-contain"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/90 line-clamp-3">
                        {previewImage.prompt}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {previewImage.size}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(previewImage.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => handleDownload(previewImage, e)}
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setPreviewImage(null)}
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
