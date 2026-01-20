# AI Storyteller Design Guidelines

## Brand Identity

**Purpose**: A creative companion that transforms ideas into stories using AI. For writers, dreamers, and anyone seeking narrative inspiration.

**Aesthetic Direction**: **Storybook Editorial** - Warm, literary, and inviting. Imagine a cozy reading nook meets digital magic. Uses soft serif typography for headings, generous whitespace, and earthy tones that feel like aged paper and ink.

**Memorable Element**: Stories appear with a gentle typewriter animation, making the AI generation feel like watching creativity unfold in real-time.

## Navigation Architecture

**Root Navigation**: Drawer Navigation
- Main story generation screen (home)
- Drawer contains: API Key setup, Behavior Prompt customization, About

## Screen Specifications

### 1. Story Generator (Home)
**Purpose**: Generate and display AI-created stories

**Layout**:
- Transparent header with drawer menu button (left) and settings icon (right)
- Top inset: headerHeight + Spacing.xl
- Bottom inset: insets.bottom + Spacing.xl
- Scrollable content area

**Components**:
- Prompt input card (multiline text area with placeholder "What story shall we tell today?")
- Generate button (full-width, bold, primary color)
- Story display area (rendered text with typewriter animation when generating)
- Empty state illustration (storybook-magic.png) when no story generated yet

**States**:
- Empty: Shows illustration + "Enter a prompt to begin your story"
- Loading: Animated dots with "Crafting your story..."
- Completed: Displays story text with copy/share actions

### 2. Drawer Menu
**Contains**:
- User avatar + display name (editable)
- Navigation items: API Settings, Behavior Prompt, About
- App version footer

### 3. API Settings (Modal from Drawer)
**Purpose**: Configure Gemini API key

**Layout**:
- Modal screen with close button (header left)
- Title: "API Configuration"
- Form (non-scrollable)

**Components**:
- API Key input field (secure text, with show/hide toggle)
- Test Connection button
- Status indicator (success/error feedback)
- Save button in header (right)

### 4. Behavior Prompt (Modal from Drawer)
**Purpose**: Customize AI storytelling style

**Layout**:
- Modal screen with close button (header left)
- Title: "Story Preferences"
- Scrollable form

**Components**:
- Multiline text area for custom system prompt
- Preset buttons: "Fantasy," "Mystery," "Sci-Fi," "Romance"
- Save button below form

### 5. About (Modal from Drawer)
**Purpose**: App info and credits

**Layout**:
- Modal screen with close button (header left)
- Scrollable content

**Components**:
- App icon display
- Version number
- Credits text
- Privacy info

## Color Palette

**Primary**: `#8B4513` (Saddle Brown) - warm, literary ink
**Primary Light**: `#A0633D`
**Background**: `#FDF8F3` (Cream) - aged paper feel
**Surface**: `#FFFFFF` (White) - clean cards
**Text Primary**: `#2C1810` (Dark Brown)
**Text Secondary**: `#6B5D56`
**Accent**: `#D4A574` (Soft Gold) - for highlights
**Success**: `#4A7C59`
**Error**: `#B85C50`

## Typography

**Display Font**: Playfair Display (serif, Google Font)
- Large Title: 34pt, Bold
- Title: 28pt, Semibold

**Body Font**: Inter (sans-serif, Google Font)
- Headline: 17pt, Semibold
- Body: 15pt, Regular
- Caption: 13pt, Regular
- Prompt text: 16pt, Regular (higher readability for story content)

## Visual Design

- Cards use subtle borders (`1px solid #E8DED0`) instead of shadows
- Main generate button has gentle shadow:
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- Input fields have soft rounded corners (8px)
- All interactive elements show opacity 0.7 when pressed

## Assets to Generate

1. **icon.png** - App icon featuring an open book with sparkles
   - WHERE USED: Device home screen

2. **splash-icon.png** - Simplified version of app icon
   - WHERE USED: Launch screen

3. **storybook-magic.png** - Illustration of an open book with gentle sparkles/stars emerging
   - WHERE USED: Empty state on Story Generator screen

4. **avatar-writer.png** - Default user avatar (quill pen icon in circle)
   - WHERE USED: Drawer header, Profile settings

**Asset Style**: Warm, hand-drawn aesthetic with soft colors matching the cream/brown palette. Simple line work with subtle texture.