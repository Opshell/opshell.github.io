import sys
import re
import random

from functools import partial

from PyQt6.QtCore import Qt, QEvent, QPoint, pyqtSignal
# Add QPen to the imports at the top
from PyQt6.QtGui import QColor, QPalette, QPainter, QLinearGradient, QPen, QFontMetrics, QFont


from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                           QHBoxLayout, QTextEdit, QLabel, QPushButton,
                           QScrollArea, QDialog, QLineEdit, QColorDialog,
                           QSizePolicy, QSpinBox, QFrame, QTabWidget,
                           QGroupBox, QComboBox, QCheckBox, QGridLayout, QListWidget, QListWidgetItem,  QErrorMessage)

from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                           QHBoxLayout, QLabel, QLineEdit, QSlider, QFrame)




class ColorSquare(QWidget):
    colorChanged = pyqtSignal(QColor)
    
    def __init__(self):
        super().__init__()
        self.color = QColor(255, 0, 0)
        self.setMinimumSize(200, 200)
        self.current_pos = QPoint(0, 0)
        
    def paintEvent(self, event):
        painter = QPainter(self)
        
        # Draw white to color gradient horizontally
        gradient = QLinearGradient(0, 0, self.width(), 0)
        gradient.setColorAt(0.0, Qt.GlobalColor.white)
        gradient.setColorAt(1.0, self.color)
        painter.fillRect(0, 0, self.width(), self.height(), gradient)
        
        # Draw black gradient vertically
        gradient = QLinearGradient(0, 0, 0, self.height())
        gradient.setColorAt(0.0, QColor(0, 0, 0, 0))
        gradient.setColorAt(1.0, Qt.GlobalColor.black)
        painter.fillRect(0, 0, self.width(), self.height(), gradient)
        
        # Draw single black dot indicator
        if hasattr(self, 'current_pos'):
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(Qt.GlobalColor.black)
            painter.drawEllipse(self.current_pos, 3, 3)
        
    def mousePressEvent(self, event):
        self.updateColor(event.position())
        
    def mouseMoveEvent(self, event):
        self.updateColor(event.position())
        
    def updateColor(self, pos):
        # Store the current position for indicator
        self.current_pos = QPoint(int(pos.x()), int(pos.y()))
        
        x = max(0, min(pos.x(), self.width())) / self.width()
        y = max(0, min(pos.y(), self.height())) / self.height()
        
        # Calculate color based on position
        if x == 1:
            r, g, b = self.color.red(), self.color.green(), self.color.blue()
        else:
            r = int((1 - x) * 255 + x * self.color.red())
            g = int((1 - x) * 255 + x * self.color.green())
            b = int((1 - x) * 255 + x * self.color.blue())
            
        # Add darkness based on y position
        r = int(r * (1 - y))
        g = int(g * (1 - y))
        b = int(b * (1 - y))
        
        # Create new color preserving current alpha
        new_color = QColor(r, g, b)
        if hasattr(self.color, 'alpha'):
            new_color.setAlpha(self.color.alpha())
        
        # Update display and emit signal
        self.update()
        self.colorChanged.emit(new_color)

class HueSlider(QWidget):
    hueChanged = pyqtSignal(QColor)
    
    def __init__(self):
        super().__init__()
        self.setFixedWidth(30)
        self.setMinimumHeight(200)
        self.current_y = 0

    def paintEvent(self, event):
        painter = QPainter(self)
        gradient = QLinearGradient(0, 0, 0, self.height())
        for i in range(360):
            color = QColor.fromHsv(i, 255, 255)
            gradient.setColorAt(i / 360, color)
        painter.fillRect(self.rect(), gradient)

        # Draw indicator
        if hasattr(self, 'current_y'):
            painter.setPen(QPen(Qt.GlobalColor.black, 2))
            painter.drawLine(0, self.current_y, self.width(), self.current_y)

    def mousePressEvent(self, event):
        self.updateHue(event.position())

    def mouseMoveEvent(self, event):
        self.updateHue(event.position())

    def updateHue(self, pos):
        y = max(0, min(pos.y(), self.height()))
        self.current_y = int(y)
        # 計算色相值 (0-359)
        hue = int(359 * y / self.height())
        color = QColor.fromHsv(hue, 255, 255)
        self.update()  # 重繪滑塊
        self.hueChanged.emit(color)  # 傳遞色相更改信號

class ColorPicker(QDialog):
    colorSelected = pyqtSignal(QColor)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle('Color Picker')
        self.setModal(True)
        self.initUI()
        
    def initUI(self):
        self.setFixedSize(400, 300)
        layout = QHBoxLayout(self)
        
        # Add left panel for color square
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        
        # 移除 color_indicator 的初始化
        # self.color_indicator = ColorIndicator()
        # left_layout.addWidget(self.color_indicator)
        
        # Add color square
        self.color_square = ColorSquare()
        self.color_square.colorChanged.connect(self.updateColor)
        left_layout.addWidget(self.color_square)
        
        layout.addWidget(left_panel)
        
        # Create hue slider
        self.hue_slider = HueSlider()
        self.hue_slider.hueChanged.connect(self.updateHue)
        layout.addWidget(self.hue_slider)
        
        # Create right panel for inputs
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        
        # RGB inputs
        self.rgb_inputs = {}
        for channel in ['R', 'G', 'B']:
            hlayout = QHBoxLayout()
            label = QLabel(channel)
            rgb_input = DelayedUpdater(self.updateFromRGB)  # 使用自定義類
            rgb_input.setFixedWidth(50)
            self.rgb_inputs[channel] = rgb_input
            hlayout.addWidget(label)
            hlayout.addWidget(rgb_input)
            right_layout.addLayout(hlayout)
        
        # Alpha slider
        alpha_layout = QHBoxLayout()
        alpha_label = QLabel("Alpha:")
        self.alpha_slider = QSlider(Qt.Orientation.Horizontal)
        self.alpha_slider.setRange(0, 255)
        self.alpha_slider.setValue(255)
        self.alpha_slider.valueChanged.connect(self.updateAlpha)
        alpha_layout.addWidget(alpha_label)
        alpha_layout.addWidget(self.alpha_slider)
        right_layout.addLayout(alpha_layout)

        # HTML color input
        html_layout = QHBoxLayout()
        html_label = QLabel("HTML:")
        self.html_input = DelayedUpdater(self.updateFromHTML)  # 使用自定義的 DelayedUpdater 類
        self.html_input.setPlaceholderText("#RRGGBB or #RRGGBBAA")
        html_layout.addWidget(html_label)
        html_layout.addWidget(self.html_input)
        right_layout.addLayout(html_layout)

        # Color preview
        self.preview = QFrame()
        self.preview.setMinimumSize(100, 50)
        self.preview.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Plain)
        right_layout.addWidget(self.preview)
        
        layout.addWidget(right_panel)
        
        # Initialize with red color
        self.current_color = QColor(255, 0, 0)
        self.updateInputs()
        # 移除 color_indicator 的呼叫
        # self.color_indicator.setColor(self.current_color)


    def updateColor(self, color):
        # Preserve current alpha value
        color.setAlpha(self.current_color.alpha())
        self.current_color = color
        self.updateInputs()
        # 移除 color_indicator 的呼叫
        # self.color_indicator.setColor(color)
        self.colorSelected.emit(color)

    def updateHue(self, color):
        # 使用滑塊顏色更新 ColorSquare 的基色
        self.color_square.color = color
        self.color_square.update()
        # 保留透明度
        color.setAlpha(self.current_color.alpha())
        self.current_color = color
        self.updateInputs()

        # **同步更新到使用此顏色的預覽框**
        self.colorSelected.emit(self.current_color)

    def updateFromRGB(self):
        try:
            r = int(self.rgb_inputs['R'].text() or 0)
            g = int(self.rgb_inputs['G'].text() or 0)
            b = int(self.rgb_inputs['B'].text() or 0)
            self.current_color = QColor(
                min(255, max(0, r)),
                min(255, max(0, g)),
                min(255, max(0, b)),
                self.alpha_slider.value()
            )
            self.updateInputs(skip_rgb=True)
            # 同步更新顏色到其他部分
            self.color_square.color = self.current_color
            self.color_square.update()
            self.colorSelected.emit(self.current_color)
        except ValueError:
            pass
            
    def updateFromHTML(self):
        color = QColor(self.html_input.text())
        if color.isValid():
            # 更新當前顏色
            self.current_color = color
            self.updateInputs(skip_html=True)

            # 同步更新顏色到 ColorSquare
            self.color_square.color = color
            self.color_square.update()

            # 同步更新其他視圖（例如 Preview）
            self.colorSelected.emit(self.current_color)

    def updateAlpha(self, value):
        self.current_color.setAlpha(value)
        self.updateInputs(skip_html=False)  # 確保更新 HTML 色碼
        # 同步更新顏色
        self.color_square.color = self.current_color
        self.color_square.update()
        self.colorSelected.emit(self.current_color)
        
    def updateInputs(self, skip_rgb=False, skip_html=False):
        # Update RGB inputs
        if not skip_rgb:
            self.rgb_inputs['R'].setText(str(self.current_color.red()))
            self.rgb_inputs['G'].setText(str(self.current_color.green()))
            self.rgb_inputs['B'].setText(str(self.current_color.blue()))
            
        # Update HTML input
        if not skip_html:
            self.html_input.setText(self.current_color.name())
            
        # Update alpha slider
        self.alpha_slider.setValue(self.current_color.alpha())
            
        # Update preview
        self.preview.setStyleSheet(
            f"background-color: rgba({self.current_color.red()}, "
            f"{self.current_color.green()}, {self.current_color.blue()}, "
            f"{self.current_color.alpha() / 255.0});"
        )

class ColorIndicator(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.color = QColor(255, 255, 255)
        self.setMinimumSize(30, 30)
        self.setMaximumSize(30, 30)
        
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # Draw circle
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(self.color)
        painter.drawEllipse(2, 2, 26, 26)
        
        # Draw border
        painter.setPen(QColor(128, 128, 128))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawEllipse(2, 2, 26, 26)
        
    def setColor(self, color):
        self.color = color
        self.update()

class EnhancedColorWidget(QWidget):

    colorChanged = pyqtSignal(QColor)
    
    def __init__(self, initial_color=None, parent=None):
        super().__init__(parent)
        self.color = initial_color or QColor(255, 255, 255)
        self.enabled = True
        
        layout = QVBoxLayout(self)
        
        # Top row with enable checkbox and color indicator
        top_layout = QHBoxLayout()
        
        # Enable checkbox
        self.enable_check = QCheckBox("Enable")
        self.enable_check.setChecked(True)
        self.enable_check.stateChanged.connect(self.toggle_enabled)
        top_layout.addWidget(self.enable_check)
        
        # Color indicator
        self.color_indicator = ColorIndicator()
        top_layout.addWidget(self.color_indicator)
        top_layout.addStretch()
        
        layout.addLayout(top_layout)
        
        # Color picker dialog
        self.color_dialog = ColorPicker()
        self.color_dialog.colorSelected.connect(self.update_from_picker)  # Use new signal name
        
        # Color picker button
        picker_btn = QPushButton("Choose Color")
        picker_btn.clicked.connect(self.show_color_picker)
        layout.addWidget(picker_btn)
        
        # HTML color code input
        html_layout = QHBoxLayout()
        html_label = QLabel("HTML:")
        self.html_input = QLineEdit(self.color.name())
        self.html_input.setPlaceholderText("#RRGGBB or #RRGGBBAA")
        self.html_input.textChanged.connect(self.update_from_html)
        html_layout.addWidget(html_label)
        html_layout.addWidget(self.html_input)
        layout.addLayout(html_layout)
        
        # Color preview
        self.preview = QFrame()
        self.preview.setFixedHeight(30)
        self.preview.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Plain)
        self.update_preview()
        layout.addWidget(QLabel("Preview:"))
        layout.addWidget(self.preview)
        
        # Update initial state
        self.update_color_indicator()
        

    def show_color_picker(self):
        # Create new color picker instance if needed
        if not hasattr(self, 'color_dialog') or self.color_dialog is None:
            self.color_dialog = ColorPicker()
            self.color_dialog.colorSelected.connect(self.update_from_picker)
            
            # Set window flags to stay on top
            self.color_dialog.setWindowFlags(
                Qt.WindowType.Window |  # Make it a window
                Qt.WindowType.WindowStaysOnTopHint |  # Stay on top
                Qt.WindowType.Tool  # Tool window (less prominent in taskbar)
            )
            
            # Set the color picker as a child of the top-level window
            top_level = self.window()
            if top_level:
                self.color_dialog.setParent(top_level)
        
        # Center the color picker relative to the parent window
        parent_geometry = self.window().geometry()
        dialog_geometry = self.color_dialog.geometry()
        x = parent_geometry.x() + (parent_geometry.width() - dialog_geometry.width()) // 2
        y = parent_geometry.y() + (parent_geometry.height() - dialog_geometry.height()) // 2
        self.color_dialog.move(x, y)
        
        # Show dialog
        self.color_dialog.exec()  # Use exec() instead of show()
        self.color_dialog.raise_()
        self.color_dialog.activateWindow()
        
    def toggle_enabled(self, state):
        self.enabled = bool(state)
        self.update_preview()
        self.update_color_indicator()
        
    def update_from_picker(self, color):
        if not color.isValid():
            return
        self.color = color
        self.html_input.setText(color.name(QColor.NameFormat.HexArgb))
        self.update_preview()
        self.update_color_indicator()
        self.colorChanged.emit(color)
        
    def update_from_html(self, text):
        color = QColor(text)
        if color.isValid():
            self.color = color
            self.color_dialog.updateColor(color)
            self.update_preview()
            self.update_color_indicator()
            self.colorChanged.emit(color)
            
    def update_preview(self):
        if self.enabled:
            self.preview.setStyleSheet(
                f"background-color: rgba({self.color.red()}, {self.color.green()}, "
                f"{self.color.blue()}, {self.color.alpha()});"
            )
        else:
            self.preview.setStyleSheet("")
            
    def update_color_indicator(self):
        if self.enabled:
            self.color_indicator.setColor(self.color)
        else:
            self.color_indicator.setColor(QColor(128, 128, 128))
            
    def get_color(self):
        return self.color if self.enabled else None

class ColorEditWidget(QWidget):
    def __init__(self, initial_color=None, parent=None):
        super().__init__(parent)
        self.color = initial_color or QColor(255, 255, 255)
        
        layout = QVBoxLayout(self)
        
        # Create spinboxes for RGBA
        rgba_layout = QHBoxLayout()
        
        # R component
        r_layout = QVBoxLayout()
        r_label = QLabel("R:")
        self.r_spin = QSpinBox()
        self.r_spin.setRange(0, 255)
        self.r_spin.setValue(self.color.red())
        self.r_spin.valueChanged.connect(self.update_color_from_spinboxes)
        r_layout.addWidget(r_label)
        r_layout.addWidget(self.r_spin)
        rgba_layout.addLayout(r_layout)
        
        # G component
        g_layout = QVBoxLayout()
        g_label = QLabel("G:")
        self.g_spin = QSpinBox()
        self.g_spin.setRange(0, 255)
        self.g_spin.setValue(self.color.green())
        self.g_spin.valueChanged.connect(self.update_color_from_spinboxes)
        g_layout.addWidget(g_label)
        g_layout.addWidget(self.g_spin)
        rgba_layout.addLayout(g_layout)
        
        # B component
        b_layout = QVBoxLayout()
        b_label = QLabel("B:")
        self.b_spin = QSpinBox()
        self.b_spin.setRange(0, 255)
        self.b_spin.setValue(self.color.blue())
        self.b_spin.valueChanged.connect(self.update_color_from_spinboxes)
        b_layout.addWidget(b_label)
        b_layout.addWidget(self.b_spin)
        rgba_layout.addLayout(b_layout)
        
        # A component
        a_layout = QVBoxLayout()
        a_label = QLabel("A:")
        self.a_spin = QSpinBox()
        self.a_spin.setRange(0, 255)
        self.a_spin.setValue(self.color.alpha())
        self.a_spin.valueChanged.connect(self.update_color_from_spinboxes)
        a_layout.addWidget(a_label)
        a_layout.addWidget(self.a_spin)
        rgba_layout.addLayout(a_layout)
        
        layout.addLayout(rgba_layout)
        
        # Color preview
        self.preview = QFrame()
        self.preview.setFixedSize(100, 30)
        self.preview.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Plain)
        self.update_preview()
        layout.addWidget(self.preview)
        
        # Color picker button
        pick_button = QPushButton("Pick Color")
        pick_button.clicked.connect(self.pick_color)
        layout.addWidget(pick_button)
        
    def update_color_from_spinboxes(self):
        self.color = QColor(
            self.r_spin.value(),
            self.g_spin.value(),
            self.b_spin.value(),
            self.a_spin.value()
        )
        self.update_preview()
        
    def update_preview(self):
        self.preview.setStyleSheet(
            f"background-color: rgba({self.color.red()}, {self.color.green()}, "
            f"{self.color.blue()}, {self.color.alpha()});"
        )
        
    def pick_color(self):
        color = QColorDialog.getColor(
            self.color, 
            self.parent(), 
            "Choose Color",
            QColorDialog.ColorDialogOption.ShowAlphaChannel
        )
        if color.isValid():
            self.color = color
            self.r_spin.setValue(color.red())
            self.g_spin.setValue(color.green())
            self.b_spin.setValue(color.blue())
            self.a_spin.setValue(color.alpha())
            self.update_preview()
            
    def get_color(self):
        return self.color

class DelayedUpdater(QLineEdit):
    def __init__(self, update_callback, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.update_callback = update_callback
        self.editingFinished.connect(self.handleUpdate)

    def handleUpdate(self):
        self.update_callback()

class EditDialog(QDialog):
    def __init__(self, parent=None, item_text="", text_color=None, bg_color=None, border_color=None):
        super().__init__(parent)
        self.setWindowTitle('Edit Item')
        self.setMinimumWidth(600)
        layout = QVBoxLayout(self)
        
        # Create tab widget
        tabs = QTabWidget()
        
        # Colors tab
        colors_tab = QWidget()
        colors_layout = QVBoxLayout(colors_tab)
        
        # Name edit
        self.name_edit = QLineEdit(item_text)
        colors_layout.addWidget(QLabel("Item Name:"))
        colors_layout.addWidget(self.name_edit)
        
        # Color editors with HTML input
        colors_layout.addWidget(QLabel("Text Color:"))
        self.text_color_editor = EnhancedColorWidget(text_color or QColor(255, 255, 255), self)
        colors_layout.addWidget(self.text_color_editor)
        
        colors_layout.addWidget(QLabel("Background Color:"))
        self.bg_color_editor = EnhancedColorWidget(bg_color or QColor(0, 0, 0), self)
        colors_layout.addWidget(self.bg_color_editor)
        
        colors_layout.addWidget(QLabel("Border Color:"))
        self.border_color_editor = EnhancedColorWidget(border_color or QColor(0, 0, 0), self)
        colors_layout.addWidget(self.border_color_editor)
        
        tabs.addTab(colors_tab, "Colors")
        
        # Effects tab
        effects_tab = QWidget()
        effects_layout = QVBoxLayout(effects_tab)
        
        # Sound settings
        sound_group = QGroupBox("Alert Sound")
        sound_layout = QVBoxLayout()
        
        self.sound_enabled = QCheckBox("Enable Sound")
        sound_layout.addWidget(self.sound_enabled)
        
        sound_settings = QHBoxLayout()
        self.sound_style = QSpinBox()
        self.sound_style.setRange(1, 9)
        self.sound_volume = QSpinBox()
        self.sound_volume.setRange(1, 300)
        self.sound_volume.setValue(300)
        
        sound_settings.addWidget(QLabel("Style:"))
        sound_settings.addWidget(self.sound_style)
        sound_settings.addWidget(QLabel("Volume:"))
        sound_settings.addWidget(self.sound_volume)
        sound_layout.addLayout(sound_settings)
        
        sound_group.setLayout(sound_layout)
        effects_layout.addWidget(sound_group)
        
        # Map icon settings
        map_group = QGroupBox("Minimap Icon")
        map_layout = QVBoxLayout()
        
        self.map_enabled = QCheckBox("Enable Map Icon")
        map_layout.addWidget(self.map_enabled)
        
        map_settings = QGridLayout()
        
        self.map_size = QComboBox()
        self.map_size.addItems(["Size 0", "Size 1", "Size 2"])
        
        self.map_color = QComboBox()
        self.map_color.addItems([
            "Red", "Green", "Blue", "Brown", "White", "Yellow", 
            "Cyan", "Grey", "Orange", "Pink", "Purple"
        ])
        
        self.map_shape = QComboBox()
        self.map_shape.addItems([
            "Circle", "Diamond", "Hexagon", "Square", "Star", "Triangle",
            "Cross", "Moon", "Raindrop", "Kite", "Pentagon", "UpsideDownHouse"
        ])
        
        map_settings.addWidget(QLabel("Size:"), 0, 0)
        map_settings.addWidget(self.map_size, 0, 1)
        map_settings.addWidget(QLabel("Color:"), 1, 0)
        map_settings.addWidget(self.map_color, 1, 1)
        map_settings.addWidget(QLabel("Shape:"), 2, 0)
        map_settings.addWidget(self.map_shape, 2, 1)
        
        map_layout.addLayout(map_settings)
        map_group.setLayout(map_layout)
        effects_layout.addWidget(map_group)
        
        # Play effect settings
        effect_group = QGroupBox("Play Effect")
        effect_layout = QVBoxLayout()
        
        self.effect_enabled = QCheckBox("Enable Effect")
        effect_layout.addWidget(self.effect_enabled)
        
        effect_color_layout = QHBoxLayout()
        self.effect_color = QComboBox()
        self.effect_colors = {
            "Red": "#FF0000",
            "Green": "#00FF00",
            "Blue": "#0000FF",
            "Brown": "#8B4513",
            "White": "#FFFFFF",
            "Yellow": "#FFFF00",
            "Cyan": "#00FFFF",
            "Grey": "#808080",
            "Orange": "#FFA500",
            "Pink": "#FFC0CB",
            "Purple": "#800080"
        }
        self.effect_color.addItems(list(self.effect_colors.keys()))
        
        # Color preview frame
        self.effect_preview = QFrame()
        self.effect_preview.setFixedSize(30, 30)
        self.effect_preview.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Plain)
        
        # Update preview when color changes
        self.effect_color.currentTextChanged.connect(self.update_effect_preview)
        
        effect_color_layout.addWidget(QLabel("Color:"))
        effect_color_layout.addWidget(self.effect_color)
        effect_color_layout.addWidget(self.effect_preview)
        effect_color_layout.addStretch()
        
        effect_layout.addLayout(effect_color_layout)
        effect_group.setLayout(effect_layout)
        effects_layout.addWidget(effect_group)
        
        # Initial preview update
        self.update_effect_preview(self.effect_color.currentText())
        
        tabs.addTab(effects_tab, "Effects")
        
        layout.addWidget(tabs)
        
        # OK/Cancel buttons
        buttons = QHBoxLayout()
        ok_btn = QPushButton("OK")
        ok_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton("Cancel")
        cancel_btn.clicked.connect(self.reject)
        buttons.addWidget(ok_btn)
        buttons.addWidget(cancel_btn)
        layout.addLayout(buttons)
    def accept(self):
        # Store color settings
        self.text_color = self.text_color_editor.get_color()
        self.bg_color = self.bg_color_editor.get_color()
        self.border_color = self.border_color_editor.get_color()
        
        # Store sound settings
        self.sound_enabled_value = self.sound_enabled.isChecked()
        self.sound_style_value = self.sound_style.value()
        self.sound_volume_value = self.sound_volume.value()
        
        # Store map icon settings
        self.map_enabled_value = self.map_enabled.isChecked()
        self.map_size_value = self.map_size.currentText()
        self.map_color_value = self.map_color.currentText()
        self.map_shape_value = self.map_shape.currentText()
        
        # Store effect settings
        self.effect_enabled_value = self.effect_enabled.isChecked()
        self.effect_color_value = self.effect_color.currentText()
        
        # Also store the actual text from the name edit
        self.name_text = self.name_edit.text()
        
        super().accept()
    def initialize_map_settings(self, block):
        # 讀取 MinimapIcon 設定
        map_match = re.search(r'MinimapIcon\s+(\d+)\s+(\w+)\s+(\w+)', block)
        if map_match:
            self.map_enabled.setChecked(True)
            size, color, shape = map_match.groups()
            self.map_size.setCurrentText(f"Size {size}")
            self.map_color.setCurrentText(color)
            self.map_shape.setCurrentText(shape)
        else:
            self.map_enabled.setChecked(False)
        
        # 讀取 PlayEffect 設定
        effect_match = re.search(r'PlayEffect\s+(\w+)', block)
        if effect_match:
            self.effect_enabled.setChecked(True)
            color = effect_match.group(1)
            self.effect_color.setCurrentText(color)
        else:
            self.effect_enabled.setChecked(False)

        # 讀取 PlayAlertSound 設定
        sound_match = re.search(r'PlayAlertSound\s+(\d+)\s+(\d+)', block)
        if sound_match:
            self.sound_enabled.setChecked(True)
            style, volume = map(int, sound_match.groups())
            self.sound_style.setValue(style)
            self.sound_volume.setValue(volume)
        else:
            self.sound_enabled.setChecked(False)



    def update_effect_preview(self, color_name):
        if hasattr(self, 'effect_colors') and color_name in self.effect_colors:
            self.effect_preview.setStyleSheet(
                f"background-color: {self.effect_colors[color_name]};"
                f"border: 1px solid #888;"
            )   


class LootSimulator(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle('Loot Simulator')
        self.setMinimumWidth(400)
        self.setMinimumHeight(600)
        self.selected_items = []
        self.initUI()

    def initUI(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(0)
        layout.setContentsMargins(0, 0, 0, 0)

        # Add buttons
        button_panel = QWidget()
        button_panel.setStyleSheet("background-color: #1a1a1a;")
        button_layout = QHBoxLayout(button_panel)
        button_layout.setContentsMargins(5, 5, 5, 5)
        button_layout.setSpacing(5)

        random_btn = QPushButton("Generate 10 Random")
        select_btn = QPushButton("Select Items")
        for btn in [random_btn, select_btn]:
            btn.setStyleSheet("""
                QPushButton {
                    background-color: #2a2a2a;
                    color: #c8c8c8;
                    border: none;
                    padding: 5px 10px;
                    font-size: 12px;
                }
                QPushButton:hover {
                    background-color: #3a3a3a;
                }
            """)

        random_btn.clicked.connect(self.show_random_loot)
        select_btn.clicked.connect(self.show_item_selector)

        button_layout.addWidget(random_btn)
        button_layout.addWidget(select_btn)
        layout.addWidget(button_panel)

        # Items display area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("""
            QScrollArea {
                border: none;
                background-color: #000000;
            }
            QScrollBar:vertical {
                border: none;
                width: 6px;
                margin: 0px;
                background: #1a1a1a;
            }
            QScrollBar::handle:vertical {
                background: #3a3a3a;
                min-height: 20px;
            }
            QScrollBar::add-line:vertical, 
            QScrollBar::sub-line:vertical {
                border: none;
                background: none;
                height: 0px;
            }
        """)

        container = QWidget()
        container.setStyleSheet("background-color: #000000;")
        
        # Initialize both layouts
        self.item_layout = QVBoxLayout(container)
        self.item_layout.setSpacing(0)
        self.item_layout.setContentsMargins(2, 2, 2, 2)

        # Create sections for random and selected items
        random_container = QWidget()
        random_container.setMinimumWidth(300)  # Prevent text wrapping
        self.random_layout = QVBoxLayout(random_container)
        self.random_layout.setSpacing(1)
        self.random_layout.setContentsMargins(4, 4, 4, 4)

        selected_container = QWidget()
        selected_container.setMinimumWidth(300)  # Prevent text wrapping
        self.selected_layout = QVBoxLayout(selected_container)
        self.selected_layout.setSpacing(1)
        self.selected_layout.setContentsMargins(4, 4, 4, 4)

        # Add containers to main layout
        self.item_layout.addWidget(random_container)
        self.item_layout.addWidget(selected_container)
        self.item_layout.addStretch()

        scroll.setWidget(container)
        layout.addWidget(scroll)



    def get_selected_items(self):
        """Get list of selected items"""
        selected = []
        for i in range(self.item_layout.count()):
            item = self.item_layout.itemAt(i).widget()
            if item:
                checkbox = item.findChild(QCheckBox)
                label = item.findChild(QLabel)
                if checkbox and label and checkbox.isChecked():
                    selected.append({
                        'name': label.text(),
                        'style': label.styleSheet()
                    })
        return selected

    def _create_item_label(self, block, item_name):
        label = QLabel(item_name)
        # Change from filter_viewer to parent()
        style = self.parent().create_style_from_block(block)
        
        # Get original font size and scale it down
        font_size = 32  # 預設值
        size_match = re.search(r'font-size:\s*(\d+)px', style)
        if size_match:
            font_size = int(size_match.group(1))

        # 使用更準確的比例計算
        display_size = int(font_size * 0.75)  # 減少字體以適應框架
        style = style.replace(f"font-size: {font_size}px;", f"font-size: {display_size}px;")

        
        # Update style with proper text wrapping and width constraints
        style = style.replace(f"font-size: {font_size}px;", f"font-size: {display_size}px;")
        style = style.replace("padding: 8px 4px;", "padding: 2px 4px;")
        style = style.replace("margin: 1px 0px;", "margin: 0;")
        
        label.setStyleSheet(style)
        return label

    def show_selected_loot(self):
        """Display selected items"""
        # Clear existing items first
        self._clear_layout(self.selected_layout)
        
        # Get and display selected items
        selected_items = self.get_selected_items()
        for item in selected_items:
            container = QWidget()
            container_layout = QVBoxLayout(container)
            container_layout.setContentsMargins(1, 0, 1, 0)
            container_layout.setSpacing(0)
            
            # Create label with scaled font size
            label = QLabel(item['name'])
            style = item['style']
            if 'font-size:' in style:
                font_size = 32  # Default
                size_match = re.search(r'font-size:\s*(\d+)px', style)
                if size_match:
                    font_size = int(size_match.group(1))
                display_size = int(font_size * (15/45))  # Same scaling as random items
                style = style.replace(f"font-size: {font_size}px;", f"font-size: {display_size}px;")
                
            label.setStyleSheet(style)
            container_layout.addWidget(label)
            
            self.selected_layout.addWidget(container)

    def show_random_loot(self):
        """Display 10 random items from the filter"""
        self._clear_layout(self.random_layout)
        
        filter_text = self.parent().filter_input.toPlainText()
        blocks = [
            filter_text[start:end].strip()
            for start, end in zip(
                self.parent().block_positions,
                self.parent().block_positions[1:] + [len(filter_text)]
            )
        ]
        
        if not blocks:
            return

        # Generate items
        for _ in range(10):
            if not blocks:
                continue
            
            block = random.choice(blocks)
            item_name = self._extract_item_name(block)
            
            # Create container for proper spacing
            container = QWidget()
            container.setStyleSheet("background: transparent;")
            container_layout = QVBoxLayout(container)
            container_layout.setContentsMargins(1, 0, 1, 0)
            container_layout.setSpacing(0)
            
            label = self._create_item_label(block, item_name)
            container_layout.addWidget(label)
            
            # Add to layout
            self.random_layout.insertWidget(self.random_layout.count() - 1, container)

    def show_item_selector(self):
        """Show dialog to select items from filter"""
        dialog = ItemSelector(self.parent(), self)
        if dialog.exec():
            self._clear_layout(self.selected_layout)
            for item in dialog.get_selected_items():
                label = QLabel(item['name'])
                label.setStyleSheet(item['style'])
                self.selected_layout.insertWidget(self.selected_layout.count() - 1, label)

    def _extract_item_name(self, block):
        """Extract item name from filter block"""
        # Try comment first
        comment_match = re.search(r'^(?:Show|Hide)\s+#\s*(.+?)(?=\n|$)', block, re.MULTILINE)
        if comment_match:
            return comment_match.group(1).strip()
            
        # Try BaseType next    
        base_type = re.search(r'BaseType\s+"([^"]+)"', block)
        if base_type:
            return base_type.group(1)
            
        # Finally try Class
        class_type = re.search(r'Class\s+"([^"]+)"', block)
        if class_type:
            return class_type.group(1)
            
        return "Unknown Item"

    def _clear_layout(self, layout):
        """Clear all widgets from layout except the last stretch"""
        while layout.count() > 1:
            child = layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()

class ItemSelector(QDialog):
    def __init__(self, filter_viewer, parent=None):
        super().__init__(parent)
        self.filter_viewer = filter_viewer
        self.setWindowTitle('Select Items')
        self.setMinimumWidth(400)
        self.setMinimumHeight(600)
        self.initUI()

    def initUI(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(0)
        layout.setContentsMargins(0, 0, 0, 0)

        # Add instructions label
        instructions = QLabel("Select items to display")
        instructions.setStyleSheet("""
            QLabel {
                background: #1a1a1a;
                color: #c8c8c8;
                padding: 10px;
                font-size: 14px;
            }
        """)
        layout.addWidget(instructions)

        # Item list
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("""
            QScrollArea {
                border: none;
                background: #000000;
            }
            QScrollBar:vertical {
                border: none;
                width: 6px;
                background: #1a1a1a;
            }
            QScrollBar::handle:vertical {
                background: #3a3a3a;
                min-height: 20px;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                border: none;
                background: none;
                height: 0px;
            }
        """)

        container = QWidget()
        container.setStyleSheet("background: #000000;")
        self.item_layout = QVBoxLayout(container)
        self.item_layout.setSpacing(1)
        self.item_layout.setContentsMargins(4, 4, 4, 4)

        # Add items from filter
        filter_text = self.filter_viewer.filter_input.toPlainText()
        blocks = [
            filter_text[start:end].strip()
            for start, end in zip(
                self.filter_viewer.block_positions,
                self.filter_viewer.block_positions[1:] + [len(filter_text)]
            )
        ]

        for block in blocks:
            item = QWidget()
            item_layout = QHBoxLayout(item)
            item_layout.setContentsMargins(4, 0, 4, 0)
            item_layout.setSpacing(8)

            # Checkbox with PoE style
            checkbox = QCheckBox()
            checkbox.setStyleSheet("""
                QCheckBox {
                    spacing: 8px;
                }
                QCheckBox::indicator {
                    width: 16px;
                    height: 16px;
                    background: #1a1a1a;
                    border: 1px solid #3a3a3a;
                }
                QCheckBox::indicator:checked {
                    background: #3a3a3a;
                }
            """)

            # Item name with filter styling
            name = self._extract_item_name(block)
            label = QLabel(name)
            style = self.filter_viewer.create_style_from_block(block)
            style = style.replace("font-size: 32px;", "font-size: 18px;")
            style = style.replace("padding: 8px 4px;", "padding: 2px 4px;")
            label.setStyleSheet(style)
            label.setProperty('block', block)

            item_layout.addWidget(checkbox)
            item_layout.addWidget(label)
            item_layout.addStretch()

            self.item_layout.addWidget(item)

        scroll.setWidget(container)
        layout.addWidget(scroll)

        # Add button panel
        button_panel = QWidget()
        button_panel.setStyleSheet("background: #1a1a1a;")
        button_layout = QHBoxLayout(button_panel)
        button_layout.setContentsMargins(10, 10, 10, 10)

        # Update checkbox styling for better visibility
        checkbox_style = """
            QCheckBox {
                spacing: 8px;
            }
            QCheckBox::indicator {
                width: 18px;
                height: 18px;
                background-color: #2b2b2b;
                border: 2px solid #666666;
                border-radius: 3px;
            }
            QCheckBox::indicator:unchecked:hover {
                border-color: #888888;
                background-color: #333333;
            }
            QCheckBox::indicator:checked {
                background-color: #4a90e2;
                border-color: #357abd;
            }
            QCheckBox::indicator:checked:hover {
                background-color: #5a9ee2;
                border-color: #458acd;
            }
        """
        for i in range(self.item_layout.count()):
            item = self.item_layout.itemAt(i).widget()
            if item:
                checkbox = item.findChild(QCheckBox)
                if checkbox:
                    checkbox.setStyleSheet(checkbox_style)

        # Add buttons
        confirm_btn = QPushButton("Generate Selected")
        confirm_btn.setStyleSheet("""
            QPushButton {
                background: #2a2a2a;
                color: #c8c8c8;
                border: none;
                padding: 8px 16px;
                font-size: 14px;
                min-width: 120px;
            }
            QPushButton:hover {
                background: #3a3a3a;
            }
        """)
        confirm_btn.clicked.connect(self.accept)

        button_layout.addStretch()
        button_layout.addWidget(confirm_btn)
        button_layout.addStretch()

        layout.addWidget(button_panel)

    def _extract_item_name(self, block):
        """Extract item name from filter block"""
        comment_match = re.search(r'^(?:Show|Hide)\s+#\s*(.+?)(?=\n|$)', block, re.MULTILINE)
        if comment_match:
            return comment_match.group(1).strip()
            
        base_type = re.search(r'BaseType\s+"([^"]+)"', block)
        if base_type:
            return base_type.group(1)
            
        class_type = re.search(r'Class\s+"([^"]+)"', block)
        if class_type:
            return class_type.group(1)
            
        return "Unknown Item"

    def get_selected_items(self):
        """Get list of selected items"""
        selected = []
        for i in range(self.item_layout.count()):
            item = self.item_layout.itemAt(i).widget()
            if item:
                checkbox = item.findChild(QCheckBox)
                label = item.findChild(QLabel)
                if checkbox and label and checkbox.isChecked():
                    block = label.property('block')
                    selected.append({
                        'name': label.text(),
                        'style': label.styleSheet()
                    })
        return selected

class ItemSelectorDialog(QDialog):
    def __init__(self, filter_viewer, parent=None):
        super().__init__(parent)
        self.filter_viewer = filter_viewer
        self.selected_items = []
        self.setWindowTitle("Select Items")
        self.setMinimumWidth(400)  # Wider for proper item display
        self.initUI()

    def initUI(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(0)
        layout.setContentsMargins(0, 0, 0, 0)

        # Item list
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("""
            QScrollArea {
                border: none;
                background-color: #000000;
            }
            QScrollBar:vertical {
                border: none;
                background: #1a1a1a;
                width: 8px;
                margin: 0px;
            }
            QScrollBar::handle:vertical {
                background: #3a3a3a;
                min-height: 20px;
            }
            QScrollBar::add-line:vertical,
            QScrollBar::sub-line:vertical {
                border: none;
                background: none;
                height: 0px;
            }
        """)

        list_container = QWidget()
        self.list_layout = QVBoxLayout(list_container)
        self.list_layout.setSpacing(1)
        self.list_layout.setContentsMargins(4, 4, 4, 4)
        
        # Add items from filter
        filter_text = self.filter_viewer.filter_input.toPlainText()
        blocks = [
            filter_text[start:end].strip()
            for start, end in zip(
                self.filter_viewer.block_positions,
                self.filter_viewer.block_positions[1:] + [len(filter_text)]
            )
        ]

        for block in blocks:
            container = QWidget()
            container_layout = QHBoxLayout(container)
            container_layout.setContentsMargins(0, 0, 0, 0)
            container_layout.setSpacing(8)
            
            checkbox = QCheckBox()
            checkbox.setStyleSheet("""
                QCheckBox {
                    spacing: 8px;
                }
                QCheckBox::indicator {
                    width: 16px;
                    height: 16px;
                    background: #1a1a1a;
                    border: 1px solid #3a3a3a;
                }
                QCheckBox::indicator:checked {
                    background: #3a3a3a;
                }
            """)
            
            name = self._extract_item_name(block)
            
            label = QLabel(name)
            style = self.filter_viewer.create_style_from_block(block)
            style = style.replace("font-size: 32px;", "font-size: 14px;")
            style = style.replace("padding: 8px 4px;", "padding: 4px 8px;")
            style = style.replace("QLabel {", """QLabel {
                min-height: 24px;
                line-height: 24px;
            """)
            label.setStyleSheet(style)
            
            container_layout.addWidget(checkbox)
            container_layout.addWidget(label)
            container_layout.addStretch()
            
            self.list_layout.addWidget(container)

        scroll.setWidget(list_container)
        layout.addWidget(scroll)

        # Button panel
        button_panel = QWidget()
        button_panel.setStyleSheet("background-color: #1a1a1a;")
        button_layout = QHBoxLayout(button_panel)
        button_layout.setContentsMargins(8, 8, 8, 8)
        
        generate_btn = QPushButton("Generate Selected")
        generate_btn.setStyleSheet("""
            QPushButton {
                background-color: #2a2a2a;
                color: #c8c8c8;
                border: 1px solid #3a3a3a;
                padding: 6px 12px;
                font-size: 12px;
                min-height: 24px;
            }
            QPushButton:hover {
                background-color: #3a3a3a;
            }
        """)
        generate_btn.clicked.connect(self.accept)
        
        button_layout.addStretch()
        button_layout.addWidget(generate_btn)
        button_layout.addStretch()
        
        layout.addWidget(button_panel)

    def _extract_item_name(self, block):
        """Extract item name from filter block"""
        comment_match = re.search(r'^(?:Show|Hide)\s+#\s*(.+?)(?=\n|$)', block, re.MULTILINE)
        if comment_match:
            return comment_match.group(1).strip()
            
        base_type = re.search(r'BaseType\s+"([^"]+)"', block)
        if base_type:
            return base_type.group(1)
            
        class_type = re.search(r'Class\s+"([^"]+)"', block)
        if class_type:
            return class_type.group(1)
            
        return "Unknown Item"

    def get_selected_items(self):
        selected = []
        for i in range(self.list_layout.count()):
            container = self.list_layout.itemAt(i).widget()
            if container:
                checkbox = container.findChild(QCheckBox)
                label = container.findChild(QLabel)
                if checkbox and checkbox.isChecked():
                    selected.append({
                        'name': label.text(),
                        'style': label.styleSheet()
                    })
        return selected

class FilterViewer(QMainWindow):
    def __init__(self):
        super().__init__()
        self.block_positions = []  # Store block positions
        self.initUI()
        
    def initUI(self):
        self.setWindowTitle('PoE Filter Style Viewer')
        self.setGeometry(100, 100, 1200, 800)
        
        # Main widget and layout
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QHBoxLayout(main_widget)
        
        # Left panel for filter input
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)  # 初始化 left_layout
        
        # 添加啟動模擬器的按鈕
        simulator_button = QPushButton("Open Loot Simulator")
        simulator_button.clicked.connect(self.open_loot_simulator)  # 將按鈕連接到模擬器方法
        left_layout.addWidget(simulator_button)  # 現在可以正確添加按鈕
        
        self.filter_input = QTextEdit()
        self.filter_input.setPlaceholderText("Paste filter rules here...")
        left_layout.addWidget(QLabel("Filter Input:"))
        left_layout.addWidget(self.filter_input)
        
        parse_button = QPushButton("Parse & Preview")
        parse_button.clicked.connect(self.parse_filter)
        left_layout.addWidget(parse_button)
        
        # 將左側面板添加到主布局中
        layout.addWidget(left_panel)
        
        # Right panel with scroll area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        
        self.preview_panel = QWidget()
        self.preview_layout = QVBoxLayout(self.preview_panel)
        self.preview_layout.addWidget(QLabel("Style Preview:"))
        self.preview_layout.addStretch()
        
        scroll.setWidget(self.preview_panel)
        scroll.setMinimumWidth(400)
        
        # Add panels to main layout
        layout.addWidget(scroll)
        layout.setStretch(0, 1)
        layout.setStretch(1, 1)

    # 添加 _extract_item_name 方法
    def _extract_item_name(self, block):
        """Extract item name from filter block"""
        # 試著匹配註解
        comment_match = re.search(r'^(?:Show|Hide)\s+#\s*(.+?)(?=\n|$)', block, re.MULTILINE)
        if comment_match:
            return comment_match.group(1).strip()
            
        # 匹配 BaseType    
        base_type = re.search(r'BaseType\s+"([^"]+)"', block)
        if base_type:
            return base_type.group(1)
            
        # 匹配 Class
        class_type = re.search(r'Class\s+"([^"]+)"', block)
        if class_type:
            return class_type.group(1)
            
        # 默認返回
        return "Unknown Item"
    def open_loot_simulator(self):
        simulator = LootSimulator(self)
        simulator.exec()  # 打開模擬器作為模態對話框

    def parse_color(self, color_str):
        if not color_str:
            return None
        
        rgb = re.findall(r'\d+', color_str)
        if len(rgb) >= 3:
            r, g, b = map(int, rgb[:3])
            alpha = int(rgb[3]) if len(rgb) > 3 else 255
            return QColor(r, g, b, alpha)
        return None
        
    def create_style_from_block(self, block):
        # First ensure proper block formatting
        lines = block.split('\n')
        formatted_lines = []
        
        # Process each line
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Headers with = signs
            if line.startswith('#='):
                formatted_lines.append(line)
                continue
                
            # Normal comments
            if line.startswith('#'):
                formatted_lines.append(line)
                continue
                
            # Show/Hide statements
            if line.startswith(('Show', 'Hide')):
                formatted_lines.append(line)
                continue
                
            # Settings (should be indented)
            if any(line.startswith(setting) for setting in ['Set', 'Play', 'Minimap']):
                formatted_lines.append('    ' + line)
                continue
                
            # Other conditions (BaseType etc)
            formatted_lines.append(line)
                
        block = '\n'.join(formatted_lines)
        
        # Now handle the style parsing
        text_color = re.search(r'SetTextColor\s+(.*)', block)
        border_color = re.search(r'SetBorderColor\s+(.*)', block)
        bg_color = re.search(r'SetBackgroundColor\s+(.*)', block)
        font_size = re.search(r'SetFontSize\s+(\d+)', block)
        is_hide = block.strip().startswith('Hide')

        size = 16  # Default font size
        if font_size:
            size = int(int(font_size.group(1)) * 0.5)

        style = ["QLabel {"]
        style.append("box-sizing: border-box;")  # Ensure borders are included in dimensions
        style.append("outline: none;")  # Remove default outline
        style.append("position: relative;")  # For proper stacking context
        
        # Set background first
        if bg_color:
            color = self.parse_color(bg_color.group(1))
            if color:
                style.append(f"background-color: rgba({color.red()}, {color.green()}, {color.blue()}, {color.alpha()});")
        
        # Then text color
        if text_color:
            color = self.parse_color(text_color.group(1))
            if color:
                style.append(f"color: rgba({color.red()}, {color.green()}, {color.blue()}, {color.alpha()});")
        else:
            style.append("color: rgb(255, 255, 255);")  # Default white text

        # Border last to overlay properly
        if border_color:
            color = self.parse_color(border_color.group(1))
            if color:
                style.append(f"border: 1px solid rgba({color.red()}, {color.green()}, {color.blue()}, {color.alpha()});")
                style.append("border-radius: 0px;")  # Sharp corners
        
        # Layout and sizing properties
        style.append("max-height: 200px;")
        style.append("overflow-y: auto;")
        style.append("overflow-x: hidden;")
        style.append("text-overflow: ellipsis;")
        style.append("max-width: 400px;")
        style.append("word-wrap: break-word;")
        style.append(f"font-size: {size}px;")
        style.append("padding: 4px 8px;")  # Slightly more horizontal padding
        style.append("margin: 0;")  # Remove margin to prevent gaps
        
        if is_hide:
            style.append("text-decoration: line-through;")
        
        style.append("}")
        return " ".join(style)


    def edit_filter_block(self, block_index, block):
        """
        Open a dialog to edit the block and update it.
        """
        try:
            # Extract the item name and colors for the dialog
            item_text = self._extract_item_name(block)
            style = self.create_style_from_block(block)

            # Default colors
            text_color = QColor(255, 255, 255)
            bg_color = QColor(0, 0, 0)
            border_color = QColor(0, 0, 0)

            # Parse existing colors from the block
            text_color_match = re.search(r'SetTextColor\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)', block)
            if text_color_match:
                text_color = QColor(*map(int, text_color_match.groups()))
            bg_color_match = re.search(r'SetBackgroundColor\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)', block)
            if bg_color_match:
                bg_color = QColor(*map(int, bg_color_match.groups()))
            border_color_match = re.search(r'SetBorderColor\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)', block)
            if border_color_match:
                border_color = QColor(*map(int, border_color_match.groups()))

            # Open the edit dialog
            dialog = EditDialog(self, item_text, text_color, bg_color, border_color)
            dialog.initialize_map_settings(block)  # Initialize map and effect settings from block

            if dialog.exec():  # If dialog is confirmed
                updated_block = self.update_filter_block(
                    block,
                    new_comment=dialog.name_text,
                    text_color=dialog.text_color,
                    bg_color=dialog.bg_color,
                    border_color=dialog.border_color,
                    dialog=dialog
                )
                
                # Update the filter text
                filter_text = self.filter_input.toPlainText()
                block_start = self.block_positions[block_index]
                block_end = block_start + len(block)
                updated_text = filter_text[:block_start] + updated_block + filter_text[block_end:]
                self.filter_input.setPlainText(updated_text)

                # Refresh the preview
                self.parse_filter()

        except Exception as e:
            error_dialog = QErrorMessage(self)
            error_dialog.showMessage(f"Error editing block: {str(e)}")
            error_dialog.exec()

    def update_filter_block(self, block, new_comment=None, text_color=None, bg_color=None, border_color=None, dialog=None):
        """
        Update a filter block based on user input.
        """
        # Update comment if provided
        if new_comment is not None:
            comment_match = re.search(r'^(Show|Hide)\s+#.*?(?=\n|$)', block, re.MULTILINE)
            if comment_match:
                block = block.replace(comment_match.group(0), f"{comment_match.group(1)} # {new_comment}")
            else:
                block = re.sub(r'^(Show|Hide)', r'\1 # ' + new_comment, block, flags=re.MULTILINE)
                
        # Update colors if provided
        if text_color:
            text_color_str = f"{text_color.red()} {text_color.green()} {text_color.blue()} {text_color.alpha()}"
            if 'SetTextColor' in block:
                block = re.sub(r'SetTextColor\s+.*', f'SetTextColor {text_color_str}', block)
            else:
                block += f"\n    SetTextColor {text_color_str}"
                
        if bg_color:
            bg_color_str = f"{bg_color.red()} {bg_color.green()} {bg_color.blue()} {bg_color.alpha()}"
            if 'SetBackgroundColor' in block:
                block = re.sub(r'SetBackgroundColor\s+.*', f'SetBackgroundColor {bg_color_str}', block)
            else:
                block += f"\n    SetBackgroundColor {bg_color_str}"
                
        if border_color:
            border_color_str = f"{border_color.red()} {border_color.green()} {border_color.blue()} {border_color.alpha()}"
            if 'SetBorderColor' in block:
                block = re.sub(r'SetBorderColor\s+.*', f'SetBorderColor {border_color_str}', block)
            else:
                block += f"\n    SetBorderColor {border_color_str}"
        
        # Update additional dialog settings
        if dialog:
            # Update sound settings
            if dialog.sound_enabled_value:
                sound_str = f"PlayAlertSound {dialog.sound_style_value} {dialog.sound_volume_value}"
                if 'PlayAlertSound' in block:
                    block = re.sub(r'PlayAlertSound\s+.*', sound_str, block)
                else:
                    block += f"\n    {sound_str}"
            else:
                block = re.sub(r'\n\s*PlayAlertSound\s+.*', '', block)
            
            # Update map icon settings
            if dialog.map_enabled_value:
                size = dialog.map_size_value.split()[1]  # Get just the number from "Size X"
                icon_str = f"MinimapIcon {size} {dialog.map_color_value} {dialog.map_shape_value}"
                if 'MinimapIcon' in block:
                    block = re.sub(r'MinimapIcon\s+.*', icon_str, block)
                else:
                    block += f"\n    {icon_str}"
            else:
                block = re.sub(r'\n\s*MinimapIcon\s+.*', '', block)
            
            # Update effect settings
            if dialog.effect_enabled_value:
                effect_str = f"PlayEffect {dialog.effect_color_value}"
                if 'PlayEffect' in block:
                    block = re.sub(r'PlayEffect\s+.*', effect_str, block)
                else:
                    block += f"\n    {effect_str}"
            else:
                block = re.sub(r'\n\s*PlayEffect\s+.*', '', block)
                
        return block

    def edit_item(self, index, text, item):
        # 獲取過濾器文本並解析出塊
        filter_text = self.filter_input.toPlainText()
        blocks = re.findall(
            r'(?:Show|Hide).*?(?=(?:\n\s*Show|\n\s*Hide|\Z))',
            filter_text,
            re.DOTALL
        )
        
        # 確保索引在範圍內
        if 0 <= index < len(blocks):
            block = blocks[index]

            # 提取現有顏色
            style = item.styleSheet()
            text_color = QColor(255, 255, 255)  # 預設白色
            bg_color = QColor(0, 0, 0)          # 預設黑色
            border_color = QColor(0, 0, 0)      # 預設黑色

            # 從 style 提取顏色（保持現有邏輯）
            for style_line in style.split(';'):
                if 'color:' in style_line and 'background-color' not in style_line:
                    color_match = re.search(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)', style_line)
                    if color_match:
                        text_color = QColor(int(color_match.group(1)), int(color_match.group(2)), 
                                            int(color_match.group(3)), int(color_match.group(4)))
                elif 'background-color' in style_line:
                    color_match = re.search(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)', style_line)
                    if color_match:
                        bg_color = QColor(int(color_match.group(1)), int(color_match.group(2)),
                                          int(color_match.group(3)), int(color_match.group(4)))
                elif 'border' in style_line:
                    color_match = re.search(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)', style_line)
                    if color_match:
                        border_color = QColor(int(color_match.group(1)), int(color_match.group(2)),
                                              int(color_match.group(3)), int(color_match.group(4)))

            # 打開編輯對話框
            dialog = EditDialog(self, text, text_color, bg_color, border_color)

            # 初始化當前設置
            dialog.initialize_map_settings(block)

            if dialog.exec():
                # 更新塊並重構過濾器文本
                new_block = self.update_filter_block(
                    block,
                    dialog.name_edit.text(),
                    dialog.text_color,
                    dialog.bg_color,
                    dialog.border_color,
                    dialog
                )
                blocks[index] = new_block
                self.filter_input.setText('\n'.join(blocks))
                self.parse_filter()


                
    def highlight_block(self, block_index):
        if 0 <= block_index < len(self.block_positions):
            # Get block position
            start_pos = self.block_positions[block_index]
            
            # Set cursor and scroll to position
            cursor = self.filter_input.textCursor()
            cursor.setPosition(start_pos)
            self.filter_input.setTextCursor(cursor)
            
            # Find end of block
            if block_index + 1 < len(self.block_positions):
                end_pos = self.block_positions[block_index + 1]
            else:
                end_pos = len(self.filter_input.toPlainText())
            
            # Select and highlight block
            cursor.setPosition(end_pos, cursor.MoveMode.KeepAnchor)
            self.filter_input.setTextCursor(cursor)
            
            # Ensure the block is visible
            self.filter_input.ensureCursorVisible()

    def eventFilter(self, obj, event):
        if event.type() == QEvent.Type.MouseButtonPress:
            block_index = obj.property('block_index')
            if block_index is not None:
                self.highlight_block(block_index)
                return True
        return super().eventFilter(obj, event)

    def parse_filter(self):
        try:
            filter_text = self.filter_input.toPlainText()
            
            # Clear the previous preview
            for i in reversed(range(self.preview_layout.count())):
                if i == 0:  # Keep the title
                    continue
                widget = self.preview_layout.itemAt(i).widget()
                if widget:
                    widget.deleteLater()

            # Parse filter blocks
            self.block_positions = []
            blocks = []
            for match in re.finditer(r'(?:Show|Hide).*?(?=(?:\n\s*Show|\n\s*Hide|\Z))', filter_text, re.DOTALL):
                blocks.append(match.group(0))
                self.block_positions.append(match.start())

            for i, block in enumerate(blocks):
                container = QWidget()
                container.setProperty('block_index', i)
                container.installEventFilter(self)
                container.setCursor(Qt.CursorShape.PointingHandCursor)
                container_layout = QHBoxLayout(container)
                container_layout.setContentsMargins(10, 5, 10, 5)

                content_container = QWidget()
                content_layout = QVBoxLayout(content_container)

                # Extract name based on rules
                item_text = "Unknown Item"  # Default fallback

                # Check for comment after "Show" or "Hide"
                comment_match = re.search(r'(?:Show|Hide)\s+#\s*(.+)', block)
                if comment_match:
                    item_text = comment_match.group(1).strip()
                else:
                    # Check for BaseType
                    basetype_match = re.search(r'BaseType\s*(?:==)?\s*("[^"]+")', block)
                    if basetype_match:
                        item_text = basetype_match.group(1).strip('"')
                    else:
                        # Check for Class if BaseType is not found
                        class_match = re.search(r'Class\s*(?:==)?\s*("[^"]+")', block)
                        if class_match:
                            item_text = class_match.group(1).strip('"')
                        else:
                            # Check for Rarity if neither BaseType nor Class is found
                            rarity_match = re.search(r'Rarity\s+(\w+)', block)
                            if rarity_match:
                                item_text = rarity_match.group(1)

                # Display the extracted name
                preview_item = QLabel(item_text)
                preview_item.setWordWrap(True)
                style = self.create_style_from_block(block)
                preview_item.setStyleSheet(style)

                preview_item.setFixedWidth(400)
                preview_item.setMinimumHeight(preview_item.heightForWidth(preview_item.width()))
                preview_item.adjustSize()

                scroll_area = QScrollArea()
                scroll_area.setWidget(preview_item)
                scroll_area.setWidgetResizable(True)
                scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
                scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)

                content_layout.addWidget(scroll_area)
                container_layout.addWidget(content_container)

                # Add Edit button
                edit_btn = QPushButton("Edit")
                edit_btn.setFixedWidth(60)

                # Connect Edit button to update_filter_block
                edit_btn.clicked.connect(lambda checked, idx=i, blk=block: self.edit_filter_block(idx, blk))

                container_layout.addWidget(edit_btn)

                self.preview_layout.addWidget(container)

        except Exception as e:
            error_label = QLabel(f"Error parsing filter: {str(e)}")
            error_label.setStyleSheet("color: red;")
            self.preview_layout.addWidget(error_label)





def main():
    app = QApplication(sys.argv)
    
    # Set application style
    app.setStyle('Fusion')
    
    # Create dark palette
    palette = QPalette()
    palette.setColor(QPalette.ColorRole.Window, QColor(53, 53, 53))
    palette.setColor(QPalette.ColorRole.WindowText, Qt.GlobalColor.white)
    palette.setColor(QPalette.ColorRole.Base, QColor(25, 25, 25))
    palette.setColor(QPalette.ColorRole.AlternateBase, QColor(53, 53, 53))
    palette.setColor(QPalette.ColorRole.ToolTipBase, Qt.GlobalColor.white)
    palette.setColor(QPalette.ColorRole.ToolTipText, Qt.GlobalColor.white)
    palette.setColor(QPalette.ColorRole.Text, Qt.GlobalColor.white)
    palette.setColor(QPalette.ColorRole.Button, QColor(53, 53, 53))
    palette.setColor(QPalette.ColorRole.ButtonText, Qt.GlobalColor.white)
    palette.setColor(QPalette.ColorRole.Link, QColor(42, 130, 218))
    palette.setColor(QPalette.ColorRole.Highlight, QColor(42, 130, 218))
    palette.setColor(QPalette.ColorRole.HighlightedText, Qt.GlobalColor.black)
    
    app.setPalette(palette)
    
    # Show FilterViewer instead of ColorPicker
    ex = FilterViewer()
    ex.show()
    sys.exit(app.exec())


if __name__ == '__main__':
    main()