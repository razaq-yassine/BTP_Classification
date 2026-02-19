import {
  IconBarrierBlock,
  IconBox,
  IconBug,
  IconChecklist,
  IconError404,
  IconHelp,
  IconLanguage,
  IconLayoutDashboard,
  IconLayoutSidebarLeftExpand,
  IconLock,
  IconLockAccess,
  IconMail,
  IconMessages,
  IconNotification,
  IconPackages,
  IconPalette,
  IconServerOff,
  IconSettings,
  IconTool,
  IconUserCog,
  IconUserOff,
  IconUsers
} from "@tabler/icons-react";
import {
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  Layers
} from "lucide-react";

import { type SidebarData, type NavGroup } from "../types";

export const settingsNavGroups: NavGroup[] = [
  {
    title: "Personal",
    titleKey: "navigation.personal",
    items: [
      { title: "Profile", titleKey: "navigation.profile", url: "/settings", icon: IconUserCog },
      { title: "Account", titleKey: "navigation.account", url: "/settings/account", icon: IconTool },
      { title: "Appearance", titleKey: "navigation.appearance", url: "/settings/appearance", icon: IconPalette },
      { title: "Display", titleKey: "navigation.display", url: "/settings/display", icon: IconLayoutDashboard }
    ]
  },
  {
    title: "Workspace",
    titleKey: "navigation.workspace",
    items: [
      {
        title: "Organization",
        titleKey: "navigation.organization",
        url: "/settings/organization",
        icon: Layers,
        orgUserOnly: true,
        adminAlsoSees: true
      },
      {
        title: "Tenant",
        titleKey: "navigation.tenant",
        url: "/settings/tenant",
        icon: Layers,
        tenantUserOnly: true,
        adminAlsoSees: true
      }
    ]
  },
  {
    title: "Administration",
    titleKey: "navigation.administration",
    items: [
      {
        title: "Email",
        titleKey: "navigation.email",
        url: "/settings/email",
        icon: IconMail,
        adminOnly: true
      },
      {
        title: "Email Templates",
        titleKey: "navigation.emailTemplates",
        url: "/settings/email-templates",
        icon: IconMail,
        adminOnly: true
      },
      {
        title: "Notification Settings",
        titleKey: "navigation.notificationSettings",
        url: "/settings/notification-settings",
        icon: IconNotification,
        adminOnly: true
      },
      {
        title: "Object Manager",
        titleKey: "navigation.objectManager",
        url: "/settings/object-manager",
        icon: IconBox,
        adminOnly: true
      },
      {
        title: "Permission Profiles",
        titleKey: "navigation.permissionProfiles",
        url: "/settings/profiles",
        icon: IconLockAccess,
        adminOnly: true
      },
      {
        title: "Sidebar Assignment",
        titleKey: "navigation.sidebarAssignment",
        url: "/settings/sidebar-assignment",
        icon: IconLayoutSidebarLeftExpand,
        adminOnly: true
      },
      {
        title: "Translations",
        titleKey: "navigation.translations",
        url: "/settings/translations",
        icon: IconLanguage,
        adminOnly: true
      }
    ]
  }
];

export const sidebarData: SidebarData = {
  user: {
    name: "satnaing",
    email: "satnaingdev@gmail.com",
    avatar: "/avatars/shadcn.jpg"
  },
  teams: [
    {
      name: "Shadcn Admin",
      logo: Command,
      plan: "Vite + ShadcnUI"
    },
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise"
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup"
    }
  ],
  navGroups: [
    {
      title: "General",
      items: [
        {
          title: "Dashboard",
          url: "/",
          icon: IconLayoutDashboard
        },
        {
          title: "Tasks",
          url: "/tasks",
          icon: IconChecklist
        },
        {
          title: "Apps",
          url: "/apps",
          icon: IconPackages
        },
        {
          title: "Chats",
          url: "/chats",
          badge: "3",
          icon: IconMessages
        },
        {
          title: "Users",
          url: "/users",
          icon: IconUsers
        }
      ]
    },
    {
      title: "Pages",
      items: [
        {
          title: "Auth",
          icon: IconLockAccess,
          items: [
            {
              title: "Sign In",
              url: "/sign-in"
            },
            {
              title: "Sign In (2 Col)",
              url: "/sign-in-2"
            },
            {
              title: "Sign Up",
              url: "/sign-up"
            },
            {
              title: "Forgot Password",
              url: "/forgot-password"
            },
            {
              title: "OTP",
              url: "/otp"
            }
          ]
        },
        {
          title: "Errors",
          icon: IconBug,
          items: [
            {
              title: "Unauthorized",
              url: "/401",
              icon: IconLock
            },
            {
              title: "Forbidden",
              url: "/403",
              icon: IconUserOff
            },
            {
              title: "Not Found",
              url: "/404",
              icon: IconError404
            },
            {
              title: "Internal Server Error",
              url: "/500",
              icon: IconServerOff
            },
            {
              title: "Maintenance Error",
              url: "/503",
              icon: IconBarrierBlock
            }
          ]
        }
      ]
    },
    {
      title: "Dev components",
      items: [
        {
          title: "Detail View Formatter Page",
          url: "/dev-components/detail-view-formatter",
          icon: Layers
        },
        {
          title: "Salesforce Path",
          url: "/dev-components/salesforce-path",
          icon: Layers
        }
      ]
    },
    {
      title: "Other",
      items: [
        {
          title: "Settings",
          url: "/settings",
          icon: IconSettings,
          external: true
        },
        {
          title: "Help Center",
          url: "/help-center",
          icon: IconHelp
        }
      ]
    }
  ]
};
