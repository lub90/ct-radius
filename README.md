# ct-radius

## 📶 Manage your WiFi network through ChurchTools

**Have you ever dreamed of giving every member of your church their own personal WiFi/LAN credentials? ct-radius makes that dream a reality, providing secure, individual access without any extra hassle via ChurchTools.**

By running a modified FreeRADIUS server inside a Docker container, the project enables WPA Enterprise authentication for both WiFi and LAN networks using each person’s own ChurchTools login. Instead of sharing a single password across the entire community, every member can log in with their personal account, making access more secure and traceable. VLANs can be automatically assigned based on ChurchTools groups, so ministries, staff, musicians, or guest users can be separated into different network segments without manual configuration.

At its core, ct-radius integrates with the [ct-pass-store extension](https://github.com/lub90/ct-pass-store), which allows users to manage secondary passwords specifically for third‑party systems like RADIUS, ensuring that their main ChurchTools credentials remain safe while still enabling seamless network access.

Configuration of ct-radius is designed to be flexible and high‑level, so administrators can tailor the system to their community’s needs without diving into complex technical details. Through a simple YAML configuration file, you can define which VLANs should be assigned to which groups, or set defaults for users without explicit assignments. This means you can easily adapt ct-radius to different organizational structures: for example, assigning staff to a secure VLAN, volunteers to a limited VLAN, and guests to an internet‑only VLAN. In short, the configuration options give you the freedom to align your network access policies with the way your church community is organized.

Additionally, we are currently working on another extension to ChurchTools that allows your staff to easily add guest users to your wifi for a limited amount of time - all integrated directly into ChurchTools.


## ✨ Features

- 🔐 **Personal WiFi/LAN credentials with ChurchTools login:** Each user authenticates with their own ChurchTools account, not a shared password. Through the [ct-pass-store extension](https://github.com/lub90/ct-pass-store), users create and manage a dedicated secondary password for third‑party systems like RADIUS - keeping their main ChurchTools password safe while enabling secure network access.

- 👥 **Deep ChurchTools integration:** Changes to roles, groups, or users (additions, removals, updates) take effect immediately. Once ct-radius is set up, access is automatically granted or revoked based on the user’s current ChurchTools groups - no manual syncing required.

- 🧩 **Default and group-based VLAN assignment:** Administrators define a set of groups for users that should have WiFi access. Furthermore, they can define default VLAN for general access and map specific ChurchTools groups to specialized VLANs. Users are placed into the right segment seamlessly, aligning network privileges with ministry, staff, or guest roles.

- 🔀 **On-demand VLAN selection by username suffix:** Users can request a specific VLAN by appending `#VLAN_ID` to their username (e.g., `alice#30`). If permitted by the ChurchTools configuration, they are placed into that VLAN - ideal for roles like caretakers who occasionally need access to internal, non-internet networks while typically using the standard WiFi.

- 📡 **PEAP/MSCHAPv2 for broad compatibility and security:** Uses a modern, widely supported EAP method that works reliably across Windows, Android, iOS, macOS, and Linux. Credentials are protected within a secure TLS tunnel, offering strong, up-to-date security while remaining easy to deploy.

- 🔏 **Clean server-side certificate management:** Enforces a trusted RADIUS/WiFi certificate chain so clients can verify the real network and not a spoofed access point. This prevents credential harvesting and protects users from man-in-the-middle attacks.

- 🧳 **Planned: Guest access via ChurchTools extension:** Admins or office staff can issue time-limited WiFi credentials for seminar participants or guest speakers - granting the right level of access without compromising overall security. Direclty from within ChurchTools.

- 🧭 **Planned: Rich policy rules beyond groups:** VLAN assignment and access decisions based not only on groups, but also additional ChurchTools attributes like user status or location - enabling fine-grained, context-aware network policies.

- 🛠️ **Planned: Full RADIUS server management via ChurchTools extension:** A future extension will allow administrators to configure and control the entire ct-radius setup directly from within ChurchTools, simplifying management and reducing the need for manual server-side adjustments.

## ⚙️ Setup

Setting up ct-radius requires a few steps, but is - in general - easy. Please follow the instructions [here](./docs/setup.md) to setup an individual instance of ct-radius for your church.

## 🤝 Contribution

We welcome contributions of all kinds!  
If you’ve discovered a bug, have an idea for improvement, or already prepared a fix, feel free to get involved.  

You can reach out and share your feedback or code either through:  
- [GitHub](https://github.com/lub90/)  
- [ChurchTools Forum](https://forum.church.tools/user/lubl)  

Together we can make this project stronger.


## 📝 TODOs

The following tasks are planned to improve stability, test coverage, and feature completeness of **ct-radius**:

### ✅ Testing

ct-radius already provides quite extensive tests of its core modules to ensure reliability and security. Yet, the following tasks would further improve this:

- Add unit tests for the `PasswordDatabase` class to ensure reliability of credential handling.
- Implement end-to-end tests using `eapol_test` to validate full authentication flows.  
- Test config.yaml with empty but valid vlan asignments to confirm whether `authorize` can process them or if non-empty assignments are required.  
- Extend `CtAuthProvider` tests to confirm that all WiFi access groups are evaluated, not just the standard access groups.  
- Add tests for logging behavior in `authorize` (both when a logging file is present and when it is absent).  

### 🚀 Features & Improvements
- Implement functionality for guest users, allowing temporary credentials for seminars or visitors.  
- Refactor configuration keywords out of classes into separate modules for a more modular and testable architecture.
- Review whether using user ID `998` for the freerad container user is appropriate or if another approach is safer. 
- Audit all classes for unnecessary imports and remove them to streamline the codebase.
- Allow `assignments` and `assignments_if_requested` to be empty, ensuring flexibility in configuration (see also associated tests).
- Extend support to **EAP-TTLS with PAP** as a fallback option, providing resilience if PEAP-MSCHAPv2 becomes deprecated (e.g., TLS 1.3 compatibility concerns).  
- Add a README for contributors, explaining the architecture, the reasoning behind it and how to run the tests
- Explore scenarios for WPA Enterprise login without VLAN assignment to ensure broader applicability.  


## 📜 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). See [LICENSE](LICENSE) file for further information.

## 🙌 Credits

Developed by Lukas with love for automation, SSO, and ChurchTools integration. Challenged, tested and companioned by Microsoft Copilot 🤝.