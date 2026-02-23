
const fs2 = require('fs');
const out = [];
const p = (...s) => out.push(...s);

p("'use client'");
p("");
p("import { useState, useCallback } from 'react'");
p("import {");
p("  Zap, Bot, MessageSquare, FileText, DollarSign,");
p("  Users, Palette, Wrench, Shield, Clock, BarChart3,");
p("  ChevronDown, ChevronRight, Save, ToggleLeft, ToggleRight,");
p("  AlertTriangle, CheckCircle,");
p("} from 'lucide-react'");
p("");

fs2.writeFileSync('C:/Users/12065/Desktop/usawrapco/components/settings/AICommandCenter.tsx', out.join('\n'), 'utf8');
console.log('DONE - wrote ' + out.length + ' lines');
